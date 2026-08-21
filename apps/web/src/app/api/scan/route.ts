/**
 * Streaming scan API.
 *
 * Runs a scan with `runScan` and streams each task result to the browser as a
 * Server-Sent Event, then a final summary with the graph. Node runtime — the
 * modules use `fetch` server-side. Accepts a whole profile or an explicit set
 * of check ids (single query / staged). Persists the scan to the database when
 * one is available (best-effort; the scan works without it).
 */

import { PHASES, entityId, runScan } from '@janus/core';
import type { CheckConfig, EntityType, Profile } from '@janus/core';
import { createRegistry } from '@janus/checks';
import { createJob, markJobDone, persistScanReport } from '@janus/db';
import { withDb } from '@/lib/db';
import { buildGraphView } from '@/lib/graph';
import { detectType, normalizeTarget } from '@/lib/detect';
import type { DoneEvent, ScanRequest, TaskEvent } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const registry = createRegistry();
const ACTIVE_CONFIG: CheckConfig = {
  rateLimitPerSec: 15,
  timeoutMs: 20_000,
  options: { portTimeoutMs: 2500 },
};

/** Ephemeral profile that runs exactly the given checks (used for staged runs). */
function customProfile(checkIds: readonly string[]): Profile {
  const active = checkIds.some((id) => registry.get(id)?.mode === 'active');
  return {
    id: 'custom',
    title: 'Özel',
    description: 'Seçili modüller',
    phases: [...PHASES],
    allowActive: active,
    includeChecks: [...checkIds],
  };
}

export async function POST(req: Request): Promise<Response> {
  let body: ScanRequest;
  try {
    body = (await req.json()) as ScanRequest;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const value = normalizeTarget(body.value ?? '');
  if (!value) return new Response('Missing target', { status: 400 });
  const type: EntityType =
    body.type ?? (detectType(value) === 'unknown' ? 'domain' : detectType(value));

  const profile: string | Profile = body.checkIds?.length
    ? customProfile(body.checkIds)
    : (body.profileId ?? 'pasif-recon');
  const allowActive =
    typeof profile === 'string' ? profile === 'bug-bounty-surface' : profile.allowActive;
  const config = allowActive ? ACTIVE_CONFIG : undefined;
  const seeds = (body.seeds ?? []).map((n) => ({ type: n.type, value: n.value }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      try {
        const report = await runScan(
          registry,
          profile,
          { type, value },
          {
            config,
            seeds,
            onTask: (task) => {
              const evt: TaskEvent = {
                checkId: task.checkId,
                phase: task.phase,
                mode: task.mode,
                status: task.status,
                durationMs: task.durationMs,
                target: { type: task.targetEntity.type, value: task.targetEntity.value },
                skippedReason: task.skippedReason,
                error: task.error,
                observations: task.result.observations.length,
                findings: task.result.findings.length,
                entities: task.result.entities.slice(0, 400).map((e) => ({
                  id: entityId(e),
                  type: e.type,
                  value: e.value,
                })),
                edges: task.result.edges.slice(0, 400).map((e) => ({
                  from: entityId(e.from),
                  to: entityId(e.to),
                  relation: e.relation,
                })),
                newFindings: [...task.result.findings],
              };
              send('task', evt);
            },
          },
        );

        const entityTypes: Record<string, number> = {};
        for (const e of report.entities) entityTypes[e.type] = (entityTypes[e.type] ?? 0) + 1;

        // Persist best-effort; the id (if any) lets the client link to history.
        const savedId = await withDb(async (db) => {
          const job = await createJob(db, {
            target: { type, value },
            profileId: report.profileId,
            allowActive,
          });
          await persistScanReport(db, job.id, report);
          await markJobDone(db, job.id);
          return job.id;
        }, null);

        const done: DoneEvent = {
          counts: report.counts,
          entityTypes,
          findings: report.findings,
          graph: buildGraphView(report.entities, report.edges),
        };
        send('done', { ...done, savedId });
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
