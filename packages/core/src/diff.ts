/**
 * Scan diffing — the engine behind monitoring.
 *
 * Compares two snapshots of a scan (previous vs current) and reports what
 * appeared and what disappeared: entities and findings. Pure and deterministic.
 */

import type { Finding } from './types/finding.js';
import { entityId } from './graph.js';

/** Minimal entity shape needed to diff (matches persisted + in-memory forms). */
export interface DiffEntity {
  readonly id: string;
  readonly type: string;
  readonly value: string;
}

/** A snapshot of a scan: its entities and findings. */
export interface ScanSnapshot {
  readonly entities: readonly DiffEntity[];
  readonly findings: readonly Finding[];
}

export interface ScanDiff {
  readonly addedEntities: DiffEntity[];
  readonly removedEntities: DiffEntity[];
  readonly addedFindings: Finding[];
  readonly removedFindings: Finding[];
  readonly changed: boolean;
}

function findingKey(f: Finding): string {
  const where = f.entity ? entityId(f.entity) : '-';
  return `${f.code}|${where}`;
}

/** Diff a previous snapshot against the current one. */
export function diffReports(prev: ScanSnapshot, next: ScanSnapshot): ScanDiff {
  const prevEntityIds = new Set(prev.entities.map((e) => e.id));
  const nextEntityIds = new Set(next.entities.map((e) => e.id));
  const addedEntities = next.entities.filter((e) => !prevEntityIds.has(e.id));
  const removedEntities = prev.entities.filter((e) => !nextEntityIds.has(e.id));

  const prevFindingKeys = new Set(prev.findings.map(findingKey));
  const nextFindingKeys = new Set(next.findings.map(findingKey));
  const addedFindings = next.findings.filter((f) => !prevFindingKeys.has(findingKey(f)));
  const removedFindings = prev.findings.filter((f) => !nextFindingKeys.has(findingKey(f)));

  return {
    addedEntities,
    removedEntities,
    addedFindings,
    removedFindings,
    changed:
      addedEntities.length > 0 ||
      removedEntities.length > 0 ||
      addedFindings.length > 0 ||
      removedFindings.length > 0,
  };
}
