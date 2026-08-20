/**
 * Prisma client singleton.
 *
 * Reused across the process (and across HMR reloads in dev) so we don't exhaust
 * the connection pool.
 */

import { PrismaClient } from '../generated/client/index.js';

export { PrismaClient };
export type * from '../generated/client/index.js';

const globalForPrisma = globalThis as unknown as { __janusPrisma?: PrismaClient };

export const db: PrismaClient = globalForPrisma.__janusPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__janusPrisma = db;
}
