/**
 * @janus/db — durable persistence for scans (Prisma + PostgreSQL).
 */

export { db, PrismaClient } from './client.js';
export { toTaskStatus, toSeverity } from './mappers.js';
export {
  createJob,
  markJobRunning,
  markJobDone,
  markJobFailed,
  persistScanReport,
  getJobWithResults,
  listJobs,
} from './repo.js';
export type { CreateJobInput } from './repo.js';
