/**
 * In-memory entity graph.
 *
 * Turns the `EntityInput`/`EdgeInput` a check emits into persisted `Entity`/
 * `Edge` records: derives stable ids, de-duplicates by natural key, merges
 * metadata and maintains `firstSeen`/`lastSeen`. Persistence (Phase 2) uses the
 * same id derivation so the DB and the in-memory view agree.
 */

import type {
  EntityInput,
  EdgeInput,
  Entity,
  Edge,
  EntityRef,
  EntityType,
} from './types/entity.js';

/** Types whose values are case-insensitive and get lowercased for the id. */
const CASE_INSENSITIVE_TYPES = new Set<EntityType>([
  'domain',
  'subdomain',
  'ip',
  'cidr',
  'asn',
  'email',
  'url',
  'dns_record',
  'certificate',
  'technology',
  'cve',
]);

/** Normalize an entity value for id derivation (trim, case-fold when safe). */
export function normalizeValue(type: EntityType, value: string): string {
  const trimmed = value.trim();
  return CASE_INSENSITIVE_TYPES.has(type) ? trimmed.toLowerCase() : trimmed;
}

/** Derive a stable entity id from its natural key. */
export function entityId(ref: EntityRef): string {
  return `${ref.type}:${normalizeValue(ref.type, ref.value)}`;
}

/** Derive a stable edge id from endpoints + relation. */
export function edgeId(from: string, to: string, relation: string): string {
  return `${from}|${relation}|${to}`;
}

function mergeMeta(
  a: Readonly<Record<string, unknown>> | undefined,
  b: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> | undefined {
  if (!a) return b;
  if (!b) return a;
  return { ...a, ...b };
}

/** A clock, injectable so tests are deterministic. */
export type Clock = () => string;

const systemClock: Clock = () => new Date().toISOString();

export class EntityGraph {
  private readonly entities = new Map<string, Entity>();
  private readonly edges = new Map<string, Edge>();

  constructor(private readonly now: Clock = systemClock) {}

  /** Add or merge an entity, returning its persisted form. */
  addEntity(input: EntityInput, sourceCheck: string): Entity {
    const id = entityId(input);
    const ts = this.now();
    const existing = this.entities.get(id);

    if (existing) {
      const merged: Entity = {
        ...existing,
        lastSeen: ts,
        meta: mergeMeta(existing.meta, input.meta),
      };
      this.entities.set(id, merged);
      return merged;
    }

    const created: Entity = {
      id,
      type: input.type,
      value: input.value.trim(),
      meta: input.meta,
      firstSeen: ts,
      lastSeen: ts,
      sourceCheck,
    };
    this.entities.set(id, created);
    return created;
  }

  /** Add or merge an edge. Endpoints are upserted as bare entities if unseen. */
  addEdge(input: EdgeInput, sourceCheck: string): Edge {
    this.addEntity(input.from, sourceCheck);
    this.addEntity(input.to, sourceCheck);

    const from = entityId(input.from);
    const to = entityId(input.to);
    const id = edgeId(from, to, input.relation);
    const existing = this.edges.get(id);

    if (existing) {
      const merged: Edge = { ...existing, meta: mergeMeta(existing.meta, input.meta) };
      this.edges.set(id, merged);
      return merged;
    }

    const created: Edge = { id, from, to, relation: input.relation, sourceCheck, meta: input.meta };
    this.edges.set(id, created);
    return created;
  }

  /** Bulk-ingest a check's graph output. */
  ingest(
    sourceCheck: string,
    entities: readonly EntityInput[] = [],
    edges: readonly EdgeInput[] = [],
  ): void {
    for (const e of entities) this.addEntity(e, sourceCheck);
    for (const edge of edges) this.addEdge(edge, sourceCheck);
  }

  getEntity(ref: EntityRef): Entity | undefined {
    return this.entities.get(entityId(ref));
  }

  allEntities(): Entity[] {
    return [...this.entities.values()];
  }

  allEdges(): Edge[] {
    return [...this.edges.values()];
  }

  get size(): { entities: number; edges: number } {
    return { entities: this.entities.size, edges: this.edges.size };
  }
}
