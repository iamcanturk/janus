/**
 * Observations vs findings.
 *
 * An **observation** is raw data pulled from a source (a DNS record, an open
 * port, a header value). It carries no judgement.
 *
 * A **finding** is an interpretation that carries risk (a misconfiguration, an
 * exposed secret, a known-vulnerable service). A finding is always authored by
 * a check on purpose.
 *
 * Rule: an observation NEVER auto-promotes to a finding. Keep the split in every
 * layer — the UI, the report and the graph all depend on it.
 */

import type { EntityRef } from './entity.js';

/** Severity of a finding (distinct from a check's declared `risk`). */
export const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Raw data point produced by a check. No judgement attached. */
export interface Observation {
  /** Short machine-readable kind, e.g. `dns.record`, `http.header`. */
  readonly kind: string;
  /** The entity this observation is about, if any. */
  readonly entity?: EntityRef;
  /** Structured payload of the observation. */
  readonly data: Readonly<Record<string, unknown>>;
  /** Optional human-readable summary (Turkish in the UI layer). */
  readonly message?: string;
}

/** A reference backing up a finding (advisory, CVE, doc link). */
export interface FindingReference {
  readonly title: string;
  readonly url?: string;
}

/** An interpreted result that carries risk. */
export interface Finding {
  /** Short machine-readable code, e.g. `dns.zone_transfer`. */
  readonly code: string;
  readonly title: string;
  readonly severity: Severity;
  /** The entity this finding concerns, if any. */
  readonly entity?: EntityRef;
  readonly description: string;
  /** Concrete evidence (raw response snippet, matched value, etc.). */
  readonly evidence?: Readonly<Record<string, unknown>>;
  readonly references?: readonly FindingReference[];
}
