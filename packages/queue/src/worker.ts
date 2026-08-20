/**
 * Scan worker — the consumer side.
 *
 * Runs a queued scan with `runScan`, streams per-task progress back onto the
 * BullMQ job, then persists the report and flips the DB job to done/failed.
 */

import { Worker } from 'bullmq';
import type { ConnectionOptions, Job } from 'bullmq';
import type { CheckRegistry, ScanTaskReport } from '@janus/core';
import { runScan } from '@janus/core';
import type { PrismaClient } from '@janus/db';
import { markJobDone, markJobFailed, markJobRunning, persistScanReport } from '@janus/db';
import { SCAN_QUEUE_NAME } from './queue.js';
import type { ScanJobData } from './queue.js';

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
}

async function process(job: Job<ScanJobData>, deps: ScanWorkerDeps): Promise<{ counts: unknown }> {
  const { jobId, target, profileId } = job.data;
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
