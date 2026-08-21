/** Saved-scan history list. Returns `available: false` when there is no DB. */

import { withDb } from '@/lib/db';
import type { ScanSummary } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const scans = await withDb<ScanSummary[] | null>(async (db) => {
    const jobs = await db.job.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { findings: true, entities: true } } },
    });
    return jobs.map((j) => ({
      id: j.id,
      targetType: j.targetType,
      targetValue: j.targetValue,
      profileId: j.profileId,
      status: j.status,
      createdAt: j.createdAt.toISOString(),
      findings: j._count.findings,
      entities: j._count.entities,
    }));
  }, null);

  if (scans === null) return Response.json({ available: false, scans: [] });
  return Response.json({ available: true, scans });
}
