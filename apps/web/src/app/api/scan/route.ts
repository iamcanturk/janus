/**
 * Streaming scan API.
 *
 * Runs a scan with `runScan` and streams each task result to the browser as a
 * Server-Sent Event, then a final summary. Node runtime — the passive modules
 * use `fetch` and run server-side so third-party requests come from the server,
 * not the user's browser.
 *
 * This is the interactive demo path. The durable queue/DB path (Phase 2) is
 * used for background jobs.
 */

import { getProfile, runScan } from '@janus/core';
import type { CheckConfig, Edge, Entity, EntityType } from '@janus/core';
import { createRegistry } from '@janus/checks';
import type { DoneEvent, GraphView, ScanRequest, TaskEvent } from '@/lib/types';

/** Nodes shown on the pivot canvas, capped so the graph stays readable. */
const MAX_GRAPH_NODES = 250;
/** Entity types de-prioritized when the graph is capped (noisy / low-pivot). */
const LOW_PRIORITY = new Set(['url', 'dns_record']);

function buildGraph(entities: readonly Entity[], edges: readonly Edge[]): GraphView {
  const ordered = [...entities].sort((a, b) => {
    const pa = LOW_PRIORITY.has(a.type) ? 1 : 0;
    const pb = LOW_PRIORITY.has(b.type) ? 1 : 0;
    return pa - pb;
  });
  const kept = ordered.slice(0, MAX_GRAPH_NODES);
  const keptIds = new Set(kept.map((e) => e.id));
  return {
    nodes: kept.map((e) => ({ id: e.id, type: e.type, value: e.value })),
    edges: edges
      .filter((e) => keptIds.has(e.from) && keptIds.has(e.to))
      .map((e) => ({ from: e.from, to: e.to, relation: e.relation })),
    truncated: Math.max(0, entities.length - kept.length),
  };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const registry = createRegistry();

/** Conservative limits applied when a profile enables active checks. */
const ACTIVE_CONFIG: CheckConfig = {
  rateLimitPerSec: 15,
  timeoutMs: 20_000,
  options: { portTimeoutMs: 2500 },
};

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request): Promise<Response> {
  let body: ScanRequest;
  try {
    body = (await req.json()) as ScanRequest;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const value = body.value?.trim();
  if (!value) return new Response('Missing target', { status: 400 });
  const type: EntityType = body.type ?? 'domain';
  const profileId = body.profileId ?? 'pasif-recon';

  const profile = getProfile(profileId);
  if (!profile) return new Response('Unknown profile', { status: 400 });
  const config = profile.allowActive ? ACTIVE_CONFIG : undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sse(event, data)));

      try {
        const report = await runScan(
          registry,
          profileId,
          { type, value },
          {
            config,
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
              };
              send('task', evt);
            },
          },
        );

        const entityTypes: Record<string, number> = {};
        for (const e of report.entities) entityTypes[e.type] = (entityTypes[e.type] ?? 0) + 1;

        const done: DoneEvent = {
          counts: {
            tasks: report.counts.tasks,
            entities: report.counts.entities,
            edges: report.counts.edges,
            observations: report.counts.observations,
            findings: report.counts.findings,
          },
          entityTypes,
          findings: report.findings,
          graph: buildGraph(report.entities, report.edges),
        };
        send('done', done);
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
