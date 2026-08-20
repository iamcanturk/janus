/**
 * Redis connection for BullMQ.
 *
 * BullMQ workers require `maxRetriesPerRequest: null`, so we centralize the
 * connection here.
 */

import { Redis } from 'ioredis';

export type { Redis };

/** Create an ioredis connection suitable for BullMQ queues and workers. */
export function createRedisConnection(
  url = process.env.REDIS_URL ?? 'redis://localhost:6379',
): Redis {
  return new Redis(url, { maxRetriesPerRequest: null });
}
