/** Shared shapes between the streaming scan API and the client. */

import type { CheckRunStatus, Finding, EntityType } from '@janus/core';

/** One task result streamed to the browser as it completes. */
export interface TaskEvent {
  readonly checkId: string;
  readonly phase: string;
  readonly mode: 'passive' | 'active';
  readonly status: CheckRunStatus;
  readonly durationMs: number;
  readonly target: { readonly type: string; readonly value: string };
  readonly skippedReason?: string;
  readonly error?: string;
  readonly observations: number;
  readonly findings: number;
}

export interface GraphNode {
  readonly id: string;
  readonly type: string;
  readonly value: string;
}

export interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly relation: string;
}

export interface GraphView {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  /** Number of nodes dropped to keep the canvas readable (0 = complete). */
  readonly truncated: number;
}

/** Final summary streamed when the scan finishes. */
export interface DoneEvent {
  readonly counts: {
    readonly tasks: number;
    readonly entities: number;
    readonly edges: number;
    readonly observations: number;
    readonly findings: number;
  };
  readonly entityTypes: Readonly<Record<string, number>>;
  readonly findings: readonly Finding[];
  readonly graph: GraphView;
}

export interface ErrorEvent {
  readonly message: string;
}

export interface ScanRequest {
  readonly value: string;
  readonly type?: EntityType;
  /** Run a whole profile… */
  readonly profileId?: string;
  /** …or run just these checks (single query / staged). */
  readonly checkIds?: readonly string[];
  /** Entities already discovered, so this run pivots off them. */
  readonly seeds?: readonly GraphNode[];
}

/** Check metadata for the module catalog. */
export interface CheckMeta {
  readonly id: string;
  readonly phase: string;
  readonly mode: 'passive' | 'active';
  readonly risk?: 'low' | 'medium' | 'high';
  readonly needsKey: boolean;
  readonly inputs: readonly string[];
  readonly title: string;
  readonly description: string;
}

export interface ProfileMeta {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly allowActive: boolean;
  readonly checkIds: readonly string[];
}

export interface CatalogResponse {
  readonly checks: readonly CheckMeta[];
  readonly profiles: readonly ProfileMeta[];
}

/** A saved scan in the history list. */
export interface ScanSummary {
  readonly id: string;
  readonly targetType: string;
  readonly targetValue: string;
  readonly profileId: string;
  readonly status: string;
  readonly createdAt: string;
  readonly findings: number;
  readonly entities: number;
}
