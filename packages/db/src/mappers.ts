/**
 * Mapping between @janus/core value types and Prisma enum values.
 */

import type { CheckRunStatus, Severity } from '@janus/core';
import type {
  JobStatus,
  Severity as PrismaSeverity,
  TaskStatus,
} from '../generated/client/index.js';

const TASK_STATUS: Record<CheckRunStatus, TaskStatus> = {
  clean: 'CLEAN',
  observation: 'OBSERVATION',
  finding: 'FINDING',
  skipped: 'SKIPPED',
  error: 'ERROR',
};

const SEVERITY: Record<Severity, PrismaSeverity> = {
  info: 'INFO',
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
};

export function toTaskStatus(status: CheckRunStatus): TaskStatus {
  return TASK_STATUS[status];
}

export function toSeverity(severity: Severity): PrismaSeverity {
  return SEVERITY[severity];
}

export type { JobStatus, TaskStatus, PrismaSeverity };
