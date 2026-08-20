/**
 * host.http_probe — ACTIVE. Sends a live HTTP(S) request to the target to check
 * whether a web service answers, and records status, server banner and page
 * title. Never runs in a passive profile (runner safety gate).
 */

import { defineCheck } from '@janus/core';
import type { CheckContext, EntityInput, EdgeInput, Observation, Target } from '@janus/core';

function schemesFor(target: Target): string[] {
  return target.type === 'ip' ? ['http', 'https'] : ['https', 'http'];
}

export function extractTitle(html: string): string | undefined {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match?.[1]?.trim().replace(/\s+/g, ' ').slice(0, 200) || undefined;
}

interface Probe {
  readonly scheme: string;
  readonly status: number;
  readonly server?: string;
  readonly title?: string;
}

async function probe(ctx: CheckContext, url: string, scheme: string): Promise<Probe | undefined> {
  try {
    const res = await ctx.fetch(url, { redirect: 'manual', signal: ctx.signal });
    const server = res.headers.get('server') ?? undefined;
    let title: string | undefined;
    if ((res.headers.get('content-type') ?? '').includes('text/html')) {
      title = extractTitle(await res.text());
    }
    return { scheme, status: res.status, server, title };
  } catch {
    return undefined;
  }
}

export const httpProbeCheck = defineCheck({
  id: 'host.http_probe',
  phase: 'enumeration',
  mode: 'active',
  risk: 'low',
  inputs: ['domain', 'subdomain', 'ip'],
  produces: ['service', 'technology'],
  source: 'live HTTP(S) request to target',
  needsKey: false,
  title: 'Canlı HTTP probe',
  description: 'Hedefe canlı HTTP(S) isteği: yanıt durumu, sunucu başlığı ve sayfa başlığı.',
  run: async (target, ctx) => {
    for (const scheme of schemesFor(target)) {
      const result = await probe(ctx, `${scheme}://${target.value}`, scheme);
      if (!result) continue;

      const serviceValue = `${scheme}://${target.value}`;
      const entities: EntityInput[] = [
        {
          type: 'service',
          value: serviceValue,
          meta: { status: result.status, title: result.title },
        },
      ];
      const edges: EdgeInput[] = [
        { from: target, to: { type: 'service', value: serviceValue }, relation: 'serves' },
      ];
      const observations: Observation[] = [
        {
          kind: 'http.probe',
          entity: target,
          data: { scheme, status: result.status, server: result.server, title: result.title },
          message: `${scheme.toUpperCase()} ${result.status}${result.server ? ` · ${result.server}` : ''}`,
        },
      ];

      if (result.server) {
        entities.push({
          type: 'technology',
          value: result.server,
          meta: { source: 'server-header' },
        });
        edges.push({
          from: target,
          to: { type: 'technology', value: result.server },
          relation: 'runs',
        });
      }

      return { status: 'observation', entities, edges, observations };
    }

    return { status: 'clean' };
  },
});
