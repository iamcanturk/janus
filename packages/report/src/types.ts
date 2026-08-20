/** Input to the report renderer — a plain shape both the web app and the CLI can build. */

import type { CheckRunStatus, Finding } from '@janus/core';

export interface ReportTask {
  readonly checkId: string;
  readonly status: CheckRunStatus;
  readonly target: { readonly type: string; readonly value: string };
  readonly durationMs: number;
  readonly skippedReason?: string;
}

export interface ReportInput {
  readonly target: { readonly type: string; readonly value: string };
  readonly profileId: string;
  /** ISO timestamp of when the report was generated. */
  readonly generatedAt: string;
  readonly counts: {
    readonly tasks: number;
    readonly entities: number;
    readonly edges: number;
    readonly observations: number;
    readonly findings: number;
  };
  readonly entityTypes: Readonly<Record<string, number>>;
  readonly findings: readonly Finding[];
  readonly tasks?: readonly ReportTask[];
}

export interface RenderedReport {
  readonly markdown: string;
  readonly sha256: string;
  readonly generatedAt: string;
}
