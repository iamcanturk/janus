/**
 * @janus/worker — queue consumer entrypoint.
 *
 * Wires the check registry, the DB client and Redis into a BullMQ scan worker.
 * Run with `pnpm --filter @janus/worker start` (needs Postgres + Redis up).
 */

import { createRegistry } from '@janus/checks';
import { db } from '@janus/db';
import { createRedisConnection, createScanWorker } from '@janus/queue';
import { createConsoleLogger } from '@janus/core';

const log = createConsoleLogger('worker');

function main(): void {
  const registry = createRegistry();
  const connection = createRedisConnection();

  const worker = createScanWorker({
    connection,
    registry,
    db,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 4),
  });

  worker.on('completed', (job) => log.info(`job ${job.id} completed`));
  worker.on('failed', (job, err) => log.error(`job ${job?.id} failed`, { error: err.message }));

  log.info(`scan worker started with ${registry.size} checks registered`);

  const shutdown = async (): Promise<void> => {
    log.info('shutting down worker');
    await worker.close();
    connection.disconnect();
    await db.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main();
