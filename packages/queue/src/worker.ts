/**
 * Scan worker — the consumer side.
 *
 * Runs a queued scan with `runScan`, streams per-task progress back onto the
 * BullMQ job, then persists the report and flips the DB job to done/failed.
 */

import { Worker } from 'bullmq';
import type { ConnectionOptions, Job } from 'bullmq';
import type { CheckRegistry, ScanReport, ScanTaskReport } from '@janus/core';
import { diffReports, runScan } from '@janus/core';
import type { PrismaClient } from '@janus/db';
import {
  createJob,
  getPreviousSnapshot,
  markJobDone,
  markJobFailed,
  markJobRunning,
  persistScanReport,
} from '@janus/db';
import { summarizeDiff } from '@janus/report';
import { SCAN_QUEUE_NAME } from './queue.js';
import type { ScanJobData } from './queue.js';
import { logNotifier } from './notify.js';
import type { Notifier } from './notify.js';

/** Progress payload streamed as each task completes. */
export interface ScanProgress {
  readonly checkId: string;
  readonly status: ScanTaskReport['status'];
  readonly target: string;
  readonly done: number;
}

export interface ScanWorkerDeps {
  readonly connection: ConnectionOptions;
  readonly registry: CheckRegistry;
  readonly db: PrismaClient;
  readonly concurrency?: number;
  /** Used for `monitor` jobs to report what changed. Defaults to a log notifier. */
  readonly notifier?: Notifier;
}

/** For a monitor run, diff against the previous scan and notify on change. */
async function runMonitorDiff(
  deps: ScanWorkerDeps,
  jobId: string,
  data: ScanJobData,
  report: ScanReport,
): Promise<void> {
  const prev = await getPreviousSnapshot(deps.db, data.target, data.profileId, jobId);
  if (!prev) return; // first run — nothing to diff against
  const current = {
    entities: report.entities.map((e) => ({ id: e.id, type: e.type, value: e.value })),
    findings: report.findings,
  };
  const diff = diffReports(prev, current);
  if (!diff.changed) return;
  const notifier = deps.notifier ?? logNotifier;
  await notifier.notify(
    summarizeDiff(diff, {
      target: data.target,
      profileId: data.profileId,
      generatedAt: new Date().toISOString(),
    }),
  );
}

async function process(job: Job<ScanJobData>, deps: ScanWorkerDeps): Promise<{ counts: unknown }> {
  const { target, profileId } = job.data;
  // A repeatable monitor job carries fixed data, so create a fresh DB job each
  // run; a one-off scan references the job row created by the producer.
  const jobId =
    job.name === 'monitor'
      ? (
          await createJob(deps.db, {
            target,
            profileId,
            allowActive: job.data.allowActive,
            meta: { monitor: true },
          })
        ).id
      : job.data.jobId;
  await markJobRunning(deps.db, jobId);

  try {
    let done = 0;
    const report = await runScan(deps.registry, profileId, target, {
      onTask: (task: ScanTaskReport) => {
        done += 1;
        const progress: ScanProgress = {
          checkId: task.checkId,
          status: task.status,
          target: `${task.targetEntity.type}:${task.targetEntity.value}`,
          done,
        };
        void job.updateProgress(progress);
      },
    });

    await persistScanReport(deps.db, jobId, report);
    await markJobDone(deps.db, jobId);
    if (job.name === 'monitor') await runMonitorDiff(deps, jobId, job.data, report);
    return { counts: report.counts };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markJobFailed(deps.db, jobId, message);
    throw err;
  }
}

/** Create and start a scan worker. Call `.close()` to stop it. */
export function createScanWorker(deps: ScanWorkerDeps): Worker<ScanJobData> {
  return new Worker<ScanJobData>(SCAN_QUEUE_NAME, (job) => process(job, deps), {
    connection: deps.connection,
    concurrency: deps.concurrency ?? 4,
  });
}
