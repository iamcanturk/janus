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
  readonly type: EntityType;
  readonly profileId: string;
}
