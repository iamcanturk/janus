/**
 * The check contract — the single most important stable interface in Janus.
 *
 * A check is one unit of work. Each check is an independent plugin that declares
 * what it consumes and produces and how risky it is, then implements `run()`.
 *
 * The passive/active split is enforced here at the type level: an **active**
 * check MUST declare a `risk`, a **passive** check must not send a single packet
 * to the target and needs no risk rating.
 */

import type { EntityInput, EdgeInput, EntityType } from './entity.js';
import type { Observation, Finding } from './finding.js';

/** Research phase a check belongs to (mirrors the natural scan order). */
export const PHASES = [
  'scope',
  'recon',
  'enumeration',
  'surface',
  'exposure',
  'intel',
  'evidence',
] as const;
export type Phase = (typeof PHASES)[number];

/** Passive sends zero packets to the target; active sends live requests. */
export type Mode = 'passive' | 'active';

/** Declared risk of an active check. */
export const RISKS = ['low', 'medium', 'high'] as const;
export type Risk = (typeof RISKS)[number];

/** Terminal state of a single check run (drives the checklist icons). */
export type CheckRunStatus =
  | 'clean' // ✅ ran, nothing noteworthy
  | 'observation' // ⚠️ produced observations
  | 'finding' // ❌ produced at least one finding
  | 'skipped' // ⏭️ not applicable (no key / out of scope / active in passive profile)
  | 'error'; // 💥 threw while running

/** The scan target handed to a check. */
export interface Target {
  readonly type: EntityType;
  readonly value: string;
}

/** Minimal logger passed to checks (implementation provided by the runner). */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Ambient services available to a check during a run. */
export interface CheckContext {
  /** Cooperative cancellation (job cancelled, timeout). */
  readonly signal?: AbortSignal;
  readonly logger: Logger;
  /** Resolve a BYOK key by name, e.g. `SHODAN_API_KEY`. */
  readonly getKey: (name: string) => string | undefined;
  /**
   * Fetch implementation. Defaults to the global `fetch` in the runner; tests
   * inject a stub so no real network call is made.
   */
  readonly fetch: typeof fetch;
}

/** Per-run configuration (rate limits, module-specific options). */
export interface CheckConfig {
  /** Max requests per second an active check may issue. */
  readonly rateLimitPerSec?: number;
  /** Hard timeout for the whole run, in milliseconds. */
  readonly timeoutMs?: number;
  /** Module-specific options, keyed by the check author. */
  readonly options?: Readonly<Record<string, unknown>>;
}

/** Everything a check emits from a single run. */
export interface CheckResult {
  readonly status: CheckRunStatus;
  readonly entities?: readonly EntityInput[];
  readonly edges?: readonly EdgeInput[];
  readonly observations?: readonly Observation[];
  readonly findings?: readonly Finding[];
}

/** The `run()` signature every check implements. */
export type CheckRun = (
  target: Target,
  context: CheckContext,
  config: CheckConfig,
) => Promise<CheckResult> | CheckResult;

/** Fields shared by every check regardless of mode. */
interface CheckBase {
  /** Unique, dot-namespaced id, e.g. `dns.zone_transfer`. */
  readonly id: string;
  readonly phase: Phase;
  /** Entity types this check consumes. */
  readonly inputs: readonly EntityType[];
  /** Entity/edge types this check writes to the graph. */
  readonly produces: readonly EntityType[];
  /** Human-readable data source, for documentation. */
  readonly source: string;
  /** Whether a BYOK key is required for this check to run. */
  readonly needsKey: boolean;
  readonly title?: string;
  readonly description?: string;
  readonly run: CheckRun;
}

/** A passive check: sends no packets to the target, needs no risk rating. */
export interface PassiveCheck extends CheckBase {
  readonly mode: 'passive';
  readonly risk?: never;
}

/** An active check: sends live requests, so `risk` is mandatory. */
export interface ActiveCheck extends CheckBase {
  readonly mode: 'active';
  readonly risk: Risk;
}

/**
 * A check definition. The discriminated union guarantees, at compile time, that
 * an active check cannot be declared without a `risk`.
 */
export type CheckDefinition = PassiveCheck | ActiveCheck;

/**
 * Identity helper for authoring checks with full type inference and the
 * active→risk rule enforced by the compiler.
 *
 * @example
 * export const check = defineCheck({
 *   id: 'dns.zone_transfer',
 *   phase: 'recon',
 *   mode: 'passive',
 *   inputs: ['domain'],
 *   produces: ['dns_record'],
 *   source: 'DoH resolver',
 *   needsKey: false,
 *   run: async (target) => ({ status: 'clean' }),
 * });
 */
export function defineCheck<const T extends CheckDefinition>(def: T): T {
  return def;
}
