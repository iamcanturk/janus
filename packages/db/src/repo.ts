/**
 * Repositories — the only place raw Prisma calls live.
 *
 * `persistScanReport` writes a whole @janus/core `ScanReport` into the durable
 * store: the per-job entity graph, every task and its observations/findings.
 */

import type { ScanReport, Target } from '@janus/core';
import { entityId } from '@janus/core';
import type { Prisma, PrismaClient } from '../generated/client/index.js';
import { toSeverity, toTaskStatus } from './mappers.js';

function asJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined || value === null ? undefined : (value as Prisma.InputJsonValue);
}

export interface CreateJobInput {
  readonly target: Target;
  readonly profileId: string;
  readonly allowActive: boolean;
  readonly meta?: Record<string, unknown>;
}

/** Create a queued job row for a scan. */
export async function createJob(db: PrismaClient, input: CreateJobInput) {
  return db.job.create({
    data: {
      targetType: input.target.type,
      targetValue: input.target.value,
      profileId: input.profileId,
      allowActive: input.allowActive,
      status: 'QUEUED',
      meta: asJson(input.meta),
    },
  });
}

export async function markJobRunning(db: PrismaClient, jobId: string) {
  return db.job.update({
    where: { id: jobId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });
}

export async function markJobDone(db: PrismaClient, jobId: string) {
  return db.job.update({
    where: { id: jobId },
    data: { status: 'DONE', finishedAt: new Date() },
  });
}

export async function markJobFailed(db: PrismaClient, jobId: string, error: string) {
  return db.job.update({
    where: { id: jobId },
    data: { status: 'FAILED', finishedAt: new Date(), error },
  });
}

/**
 * Persist a completed scan report against an existing job. Runs in a single
 * transaction so a job's graph and tasks land atomically.
 */
export async function persistScanReport(
  db: PrismaClient,
  jobId: string,
  report: ScanReport,
): Promise<void> {
  await db.$transaction(async (tx) => {
    if (report.entities.length > 0) {
      await tx.entity.createMany({
        data: report.entities.map((e) => ({
          jobId,
          key: e.id,
          type: e.type,
          value: e.value,
          firstSeen: new Date(e.firstSeen),
          lastSeen: new Date(e.lastSeen),
          sourceCheck: e.sourceCheck,
          meta: asJson(e.meta),
        })),
        skipDuplicates: true,
      });
    }

    if (report.edges.length > 0) {
      await tx.edge.createMany({
        data: report.edges.map((edge) => ({
          jobId,
          fromKey: edge.from,
          toKey: edge.to,
          relation: edge.relation,
          sourceCheck: edge.sourceCheck,
          meta: asJson(edge.meta),
        })),
        skipDuplicates: true,
      });
    }

    for (const task of report.tasks) {
      await tx.task.create({
        data: {
          jobId,
          checkId: task.checkId,
          phase: task.phase,
          mode: task.mode,
          targetType: task.targetEntity.type,
          targetValue: task.targetEntity.value,
          status: toTaskStatus(task.status),
          durationMs: task.durationMs,
          skippedReason: task.skippedReason,
          error: task.error,
          finishedAt: new Date(),
          observations: {
            create: task.result.observations.map((o) => ({
              jobId,
              kind: o.kind,
              entityKey: o.entity ? entityId(o.entity) : null,
              data: asJson(o.data) ?? {},
              message: o.message,
            })),
          },
          findings: {
            create: task.result.findings.map((f) => ({
              jobId,
              code: f.code,
              title: f.title,
              severity: toSeverity(f.severity),
              entityKey: f.entity ? entityId(f.entity) : null,
              description: f.description,
              evidence: asJson(f.evidence),
              references: asJson(f.references),
            })),
          },
        },
      });
    }
  });
}

/** Fetch a job with its full graph and results, for the UI/report. */
export async function getJobWithResults(db: PrismaClient, jobId: string) {
  return db.job.findUnique({
    where: { id: jobId },
    include: {
      tasks: { include: { observations: true, findings: true } },
      entities: true,
      edges: true,
    },
  });
}

/** Recent jobs, newest first. */
export async function listJobs(db: PrismaClient, take = 50) {
  return db.job.findMany({ orderBy: { createdAt: 'desc' }, take });
}
