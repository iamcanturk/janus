/**
 * Scan queue — the producer side.
 *
 * A scan is enqueued after its Job row has been created in the DB, so the queue
 * payload references an existing `jobId`.
 */

import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import type { Target } from '@janus/core';
import { resolveProfile } from '@janus/core';

export const SCAN_QUEUE_NAME = 'janus:scan';

/** Payload carried by a queued scan. */
export interface ScanJobData {
  /** Id of the already-created DB Job row. */
  readonly jobId: string;
  readonly target: Target;
  readonly profileId: string;
  readonly allowActive: boolean;
}

/** Build (and validate) the queue payload from a target + profile. */
export function createScanJobData(jobId: string, target: Target, profileId: string): ScanJobData {
  const profile = resolveProfile(profileId);
  return { jobId, target, profileId: profile.id, allowActive: profile.allowActive };
}

export function createScanQueue(connection: ConnectionOptions): Queue<ScanJobData> {
  return new Queue<ScanJobData>(SCAN_QUEUE_NAME, { connection });
}

/** Enqueue a scan. Retries with exponential backoff; keeps recent history. */
export async function enqueueScan(queue: Queue<ScanJobData>, data: ScanJobData) {
  return queue.add('scan', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1_000 },
  });
}
