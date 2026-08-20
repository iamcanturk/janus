/**
 * Entity graph model.
 *
 * Every check writes its output into a shared graph of entities and edges.
 * Pivoting ("continue from this node") happens over this graph, so checks must
 * emit entities in a way that lets other checks consume them.
 *
 * The graph is intentionally extensible: known entity/relation types are
 * enumerated as string-literal constants, but any namespaced string is allowed
 * so new modules can introduce new node/edge kinds without touching core.
 */

/** Well-known entity types. New modules may introduce additional string types. */
export const KNOWN_ENTITY_TYPES = [
  'domain',
  'subdomain',
  'ip',
  'cidr',
  'asn',
  'org',
  'email',
  'url',
  'dns_record',
  'certificate',
  'port',
  'service',
  'technology',
  'github_account',
  'leaked_secret',
  'cve',
  'file',
] as const;

export type KnownEntityType = (typeof KNOWN_ENTITY_TYPES)[number];

/**
 * Entity type. Known types get autocompletion; the `(string & {})` arm keeps the
 * union open so modules can emit custom types without a core change.
 */
export type EntityType = KnownEntityType | (string & {});

/** Well-known edge relations. Open for extension, like {@link EntityType}. */
export const KNOWN_RELATIONS = [
  'resolves_to',
  'subdomain_of',
  'announced_by',
  'owned_by',
  'hosts',
  'exposes',
  'serves',
  'runs',
  'references',
  'belongs_to',
  'affected_by',
] as const;

export type KnownRelation = (typeof KNOWN_RELATIONS)[number];
export type RelationType = KnownRelation | (string & {});

/** Minimal reference to an entity by its natural key (type + value). */
export interface EntityRef {
  readonly type: EntityType;
  readonly value: string;
}

/** An entity as emitted by a check, before persistence assigns bookkeeping. */
export interface EntityInput extends EntityRef {
  /** Arbitrary structured metadata attached to the node. */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** An edge as emitted by a check. */
export interface EdgeInput {
  readonly from: EntityRef;
  readonly to: EntityRef;
  readonly relation: RelationType;
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** A persisted entity: an {@link EntityInput} plus graph bookkeeping. */
export interface Entity extends EntityInput {
  /** Stable id derived from `type` + normalized `value`. */
  readonly id: string;
  readonly firstSeen: string;
  readonly lastSeen: string;
  /** Id of the check that first produced this entity. */
  readonly sourceCheck: string;
}

/** A persisted edge. */
export interface Edge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly relation: RelationType;
  readonly sourceCheck: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}
