/**
 * Monitoring scheduler — repeatable scans for the `kendi-varligim-monitor`
 * profile. Each run diffs against the previous one (see the worker) and notifies
 * only when something changed.
 */

import type { Queue } from 'bullmq';
import type { ScanJobData } from './queue.js';

/** Stable repeat-job id so re-scheduling the same monitor replaces it. */
export function monitorJobId(data: ScanJobData): string {
  return `monitor:${data.target.type}:${data.target.value}:${data.profileId}`;
}

/**
 * Schedule (or reschedule) a repeatable monitoring scan every `everyMs`.
 * The BullMQ job name is `monitor`, which the worker treats as diff-and-notify.
 */
export async function scheduleMonitor(
  queue: Queue<ScanJobData>,
  data: ScanJobData,
  everyMs: number,
) {
  return queue.add('monitor', data, {
    repeat: { every: everyMs },
    jobId: monitorJobId(data),
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  });
}
