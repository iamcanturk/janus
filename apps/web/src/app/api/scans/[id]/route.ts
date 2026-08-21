/** Reopen a saved scan: reconstruct the results payload the client renders. */

import { getJobWithResults } from '@janus/db';
import { withDb } from '@/lib/db';
import { buildGraphView } from '@/lib/graph';
import type { DoneEvent, TaskEvent } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface SavedScan extends DoneEvent {
  readonly target: { type: string; value: string };
  readonly profileId: string;
  readonly createdAt: string;
  readonly tasks: TaskEvent[];
}

function splitKey(key: string): { type: string; value: string } {
  const i = key.indexOf(':');
  return i === -1
    ? { type: 'unknown', value: key }
    : { type: key.slice(0, i), value: key.slice(i + 1) };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  const data = await withDb<SavedScan | null>(async (db) => {
    const job = await getJobWithResults(db, id);
    if (!job) return null;

    const entityTypes: Record<string, number> = {};
    for (const e of job.entities) entityTypes[e.type] = (entityTypes[e.type] ?? 0) + 1;

    const findings = job.tasks.flatMap((t) =>
      t.findings.map((f) => ({
        code: f.code,
        title: f.title,
        severity: f.severity.toLowerCase() as DoneEvent['findings'][number]['severity'],
        entity: f.entityKey ? splitKey(f.entityKey) : undefined,
        description: f.description,
      })),
    );

    const tasks: TaskEvent[] = job.tasks.map((t) => ({
      checkId: t.checkId,
      phase: t.phase,
      mode: t.mode as 'passive' | 'active',
      status: t.status.toLowerCase() as TaskEvent['status'],
      durationMs: t.durationMs ?? 0,
      target: { type: t.targetType, value: t.targetValue },
      skippedReason: t.skippedReason ?? undefined,
      error: t.error ?? undefined,
      observations: t.observations.length,
      findings: t.findings.length,
      entities: [],
      edges: [],
      newFindings: [],
    }));

    const graph = buildGraphView(
      job.entities.map((e) => ({ id: e.key, type: e.type, value: e.value })),
      job.edges.map((e) => ({ from: e.fromKey, to: e.toKey, relation: e.relation })),
    );

    return {
      target: { type: job.targetType, value: job.targetValue },
      profileId: job.profileId,
      createdAt: job.createdAt.toISOString(),
      counts: {
        tasks: job.tasks.length,
        entities: job.entities.length,
        edges: job.edges.length,
        observations: job.tasks.reduce((n, t) => n + t.observations.length, 0),
        findings: findings.length,
      },
      entityTypes,
      findings,
      graph,
      tasks,
    };
  }, null);

  if (!data) return new Response('Not found', { status: 404 });
  return Response.json(data);
}
