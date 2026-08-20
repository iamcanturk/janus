/**
 * Check runner.
 *
 * Runs a single check safely: enforces the passive/active gate, checks the
 * target is in scope, applies an optional timeout, times the run and captures
 * any error into a structured report instead of throwing.
 *
 * SAFETY: an active check is refused unless `allowActive` is explicitly true.
 * This is the code-level guarantee behind "an active module never runs in a
 * passive profile". Profiles (Phase 2) set this flag; the default is `false`.
 */

import type {
  CheckDefinition,
  CheckConfig,
  CheckContext,
  CheckResult,
  CheckRunStatus,
  Logger,
  Mode,
  Phase,
  Target,
} from './types/check.js';
import type { EntityInput, EdgeInput } from './types/entity.js';
import type { Observation, Finding } from './types/finding.js';
import { nullLogger } from './logger.js';

/** Fully-populated result (empty arrays instead of `undefined`). */
export interface NormalizedResult {
  readonly status: CheckRunStatus;
  readonly entities: readonly EntityInput[];
  readonly edges: readonly EdgeInput[];
  readonly observations: readonly Observation[];
  readonly findings: readonly Finding[];
}

/** Outcome of running one check. Never throws for check-level failures. */
export interface CheckRunReport {
  readonly checkId: string;
  readonly mode: Mode;
  readonly phase: Phase;
  readonly status: CheckRunStatus;
  readonly durationMs: number;
  readonly result: NormalizedResult;
  /** Present when `status === 'error'`. */
  readonly error?: string;
  /** Present when `status === 'skipped'`. */
  readonly skippedReason?: string;
}

export interface RunOptions {
  /** Ambient services for the check; missing pieces get safe defaults. */
  readonly context?: Partial<CheckContext>;
  readonly config?: CheckConfig;
  /**
   * Whether active checks may run. Defaults to `false` — the safe choice.
   * A passive profile leaves this false; an active-enabled profile sets it true
   * only after explicit user opt-in.
   */
  readonly allowActive?: boolean;
  /** Clock returning epoch milliseconds; injectable for deterministic tests. */
  readonly now?: () => number;
}

function normalizeResult(r: CheckResult): NormalizedResult {
  return {
    status: r.status,
    entities: r.entities ?? [],
    edges: r.edges ?? [],
    observations: r.observations ?? [],
    findings: r.findings ?? [],
  };
}

const EMPTY: NormalizedResult = {
  status: 'skipped',
  entities: [],
  edges: [],
  observations: [],
  findings: [],
};

function buildContext(
  logger: Logger,
  base: Partial<CheckContext> | undefined,
  signal: AbortSignal,
): CheckContext {
  return {
    signal,
    logger,
    getKey: base?.getKey ?? (() => undefined),
    fetch: base?.fetch ?? globalThis.fetch,
  };
}

async function invokeWithTimeout(
  def: CheckDefinition,
  target: Target,
  context: CheckContext,
  config: CheckConfig,
  timeoutMs: number | undefined,
  onTimeout: () => void,
): Promise<CheckResult> {
  const call = Promise.resolve(def.run(target, context, config));
  if (!timeoutMs || timeoutMs <= 0) return call;

  return await new Promise<CheckResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error(`timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    call.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Run one check and return a structured report. Never throws for failures
 * originating inside the check — those become an `error` report.
 */
export async function runCheck(
  def: CheckDefinition,
  target: Target,
  options: RunOptions = {},
): Promise<CheckRunReport> {
  const now = options.now ?? Date.now;
  const logger = options.context?.logger ?? nullLogger;
  const config: CheckConfig = options.config ?? {};
  const base = { checkId: def.id, mode: def.mode, phase: def.phase } as const;

  // Safety gate: active checks are refused unless explicitly allowed.
  if (def.mode === 'active' && options.allowActive !== true) {
    return {
      ...base,
      status: 'skipped',
      durationMs: 0,
      result: EMPTY,
      skippedReason: 'active check blocked: not allowed in this profile',
    };
  }

  // Scope gate: skip if the target type is not something this check consumes.
  if (!def.inputs.includes(target.type)) {
    return {
      ...base,
      status: 'skipped',
      durationMs: 0,
      result: EMPTY,
      skippedReason: `target type "${target.type}" not in inputs [${def.inputs.join(', ')}]`,
    };
  }

  const controller = new AbortController();
  const parent = options.context?.signal;
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const context = buildContext(logger, options.context, controller.signal);

  const start = now();
  try {
    const raw = await invokeWithTimeout(def, target, context, config, config.timeoutMs, () =>
      controller.abort(),
    );
    return { ...base, status: raw.status, durationMs: now() - start, result: normalizeResult(raw) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`check "${def.id}" failed`, { message });
    return { ...base, status: 'error', durationMs: now() - start, result: EMPTY, error: message };
  }
}
