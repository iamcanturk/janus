/**
 * Lazy, optional database access for the web app.
 *
 * History/persistence is a bonus, not a requirement: if DATABASE_URL is unset or
 * the database is unreachable, these helpers return null / no-op and the app
 * keeps scanning. Nothing here throws to the caller.
 */

import 'server-only';
import type { PrismaClient } from '@janus/db';

let client: PrismaClient | null | undefined;

async function getClient(): Promise<PrismaClient | null> {
  if (client !== undefined) return client;
  if (!process.env.DATABASE_URL) {
    client = null;
    return null;
  }
  try {
    const { db } = await import('@janus/db');
    client = db;
    return db;
  } catch {
    client = null;
    return null;
  }
}

/** Run `fn` with the DB client, returning `fallback` if the DB is unavailable. */
export async function withDb<T>(fn: (db: PrismaClient) => Promise<T>, fallback: T): Promise<T> {
  const db = await getClient();
  if (!db) return fallback;
  try {
    return await fn(db);
  } catch {
    return fallback;
  }
}

/** True when persistence/history is available. */
export async function dbAvailable(): Promise<boolean> {
  return withDb(async (db) => {
    await db.$queryRaw`SELECT 1`;
    return true;
  }, false);
}
