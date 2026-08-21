/**
 * Scan orchestration.
 *
 * `selectChecks` picks the checks a profile makes eligible (for the up-front
 * checklist). `runScan` executes a full scan as a fixed-point pivot loop over
 * the entity graph: it seeds the target, runs every check whose inputs match a
 * known entity, feeds new entities back in, and repeats until nothing new can
 * run. The passive/active gate is honored via the profile's `allowActive`.
 *
 * This makes an end-to-end passive scan possible with zero infrastructure —
 * the worker (Phase 2) and web app (Phase 4) reuse the same function.
 */

import type { CheckConfig, CheckContext, CheckDefinition, Target } from './types/check.js';
import type { Entity, Edge, EntityRef, EntityInput } from './types/entity.js';
import type { Observation, Finding } from './types/finding.js';
import type { CheckRunStatus } from './types/check.js';
import type { CheckRunReport } from './runner.js';
import type { Profile } from './profile.js';
import { runCheck } from './runner.js';
import { resolveProfile } from './profile.js';
import { EntityGraph } from './graph.js';
import type { CheckRegistry } from './registry.js';

const TARGET_SOURCE = '__target__';
const DEFAULT_MAX_ROUNDS = 8;

/** The checks a profile allows to run, ignoring which entities exist yet. */
export function selectChecks(registry: CheckRegistry, profile: Profile): CheckDefinition[] {
  return registry.all().filter((c) => {
    if (!profile.phases.includes(c.phase)) return false;
    if (c.mode === 'active' && !profile.allowActive) return false;
    if (profile.excludeChecks?.includes(c.id)) return false;
    if (profile.includeChecks && !profile.includeChecks.includes(c.id)) return false;
    return true;
  });
}

/** One check run within a scan, tagged with the entity it ran against. */
export interface ScanTaskReport extends CheckRunReport {
  readonly targetEntity: EntityRef;
}

export interface ScanReport {
  readonly target: Target;
  readonly profileId: string;
  readonly tasks: readonly ScanTaskReport[];
  readonly entities: readonly Entity[];
  readonly edges: readonly Edge[];
  readonly observations: readonly Observation[];
  readonly findings: readonly Finding[];
  readonly counts: {
    readonly tasks: number;
    readonly byStatus: Readonly<Record<CheckRunStatus, number>>;
    readonly entities: number;
    readonly edges: number;
    readonly observations: number;
    readonly findings: number;
  };
}

export interface RunScanOptions {
  readonly context?: Partial<CheckContext>;
  readonly config?: CheckConfig;
  readonly now?: () => number;
  /** Safety cap on pivot rounds (default 8). */
  readonly maxRounds?: number;
  /** Streaming callback invoked as each task completes (drives the live UI). */
  readonly onTask?: (task: ScanTaskReport) => void;
  /** Entities already known (e.g. from earlier incremental runs) to pivot off. */
  readonly seeds?: readonly EntityInput[];
}

function emptyStatusCounts(): Record<CheckRunStatus, number> {
  return { clean: 0, observation: 0, finding: 0, skipped: 0, error: 0 };
}

/**
 * Run a full scan against a target using a profile.
 *
 * @param registry checks to draw from
 * @param profile  profile id or object (decides phases + `allowActive`)
 * @param target   the entity to scan (e.g. `{ type: 'domain', value: 'x.com' }`)
 */
export async function runScan(
  registry: CheckRegistry,
  profile: string | Profile,
  target: Target,
  options: RunScanOptions = {},
): Promise<ScanReport> {
  const resolved = resolveProfile(profile);
  const selected = selectChecks(registry, resolved);
  const maxRounds = options.maxRounds ?? DEFAULT_MAX_ROUNDS;

  const graph = new EntityGraph();
  graph.addEntity({ type: target.type, value: target.value }, TARGET_SOURCE);
  // Seed previously-discovered entities so an incremental run pivots off them.
  for (const seed of options.seeds ?? []) graph.addEntity(seed, TARGET_SOURCE);

  const done = new Set<string>();
  const tasks: ScanTaskReport[] = [];
  const observations: Observation[] = [];
  const findings: Finding[] = [];

  for (let round = 0; round < maxRounds; round++) {
    const pending: Array<{ check: CheckDefinition; entity: Entity }> = [];
    for (const check of selected) {
      for (const entity of graph.allEntities()) {
        if (!check.inputs.includes(entity.type)) continue;
        const key = `${check.id}|${entity.id}`;
        if (!done.has(key)) pending.push({ check, entity });
      }
    }
    if (pending.length === 0) break;

    for (const { check, entity } of pending) {
      done.add(`${check.id}|${entity.id}`);
      const entityTarget: Target = { type: entity.type, value: entity.value };
      const report = await runCheck(check, entityTarget, {
        context: options.context,
        config: options.config,
        allowActive: resolved.allowActive,
        now: options.now,
      });

      graph.ingest(check.id, report.result.entities, report.result.edges);
      observations.push(...report.result.observations);
      findings.push(...report.result.findings);

      const task: ScanTaskReport = { ...report, targetEntity: entityTarget };
      tasks.push(task);
      options.onTask?.(task);
    }
  }

  const byStatus = emptyStatusCounts();
  for (const t of tasks) byStatus[t.status]++;

  const entities = graph.allEntities();
  const edges = graph.allEdges();

  return {
    target,
    profileId: resolved.id,
    tasks,
    entities,
    edges,
    observations,
    findings,
    counts: {
      tasks: tasks.length,
      byStatus,
      entities: entities.length,
      edges: edges.length,
      observations: observations.length,
      findings: findings.length,
    },
  };
}
