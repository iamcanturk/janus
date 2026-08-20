/**
 * Schedule a repeatable monitoring scan (kendi-varligim-monitor).
 *
 *   pnpm --filter @janus/worker monitor example.com --every 360
 *
 * Needs Redis (docker compose up -d). The running worker picks up each repeat,
 * diffs against the previous run and notifies on change. Only monitor assets
 * you own.
 */

import type { EntityType } from '@janus/core';
import {
  createRedisConnection,
  createScanQueue,
  createScanJobData,
  scheduleMonitor,
} from '@janus/queue';

function parseArgs(argv: string[]): { value: string; type: EntityType; everyMs: number } {
  const positional = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
  const typeFlag = argv.indexOf('--type');
  const everyFlag = argv.indexOf('--every');
  const everyMin = everyFlag >= 0 ? Number(argv[everyFlag + 1]) : 360; // default 6h
  return {
    value: positional[0] ?? '',
    type: (typeFlag >= 0 ? argv[typeFlag + 1] : 'domain') as EntityType,
    everyMs: Math.max(1, everyMin) * 60_000,
  };
}

async function main(): Promise<void> {
  const { value, type, everyMs } = parseArgs(process.argv.slice(2));
  if (!value) {
    console.error('Usage: monitor <target> [--type domain|ip] [--every <minutes>]');
    process.exit(1);
  }

  const connection = createRedisConnection();
  const queue = createScanQueue(connection);
  const data = createScanJobData('monitor', { type, value }, 'kendi-varligim-monitor');
  await scheduleMonitor(queue, data, everyMs);

  console.log(
    `🔁 İzleme planlandı: ${type}:${value} her ${everyMs / 60_000} dakikada bir (kendi-varligim-monitor).`,
  );
  await queue.close();
  connection.disconnect();
  process.exit(0);
}

void main();
