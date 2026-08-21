/**
 * http.robots — ACTIVE. Reads /robots.txt for disallowed paths and sitemaps,
 * a classic source of forgotten endpoints.
 */

import { defineCheck } from '@janus/core';
import type { EntityInput, EdgeInput } from '@janus/core';
import { probePath } from '../net/probe.js';

export function parseRobots(text: string, base: string): { paths: string[]; sitemaps: string[] } {
  const paths = new Set<string>();
  const sitemaps = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(Disallow|Allow|Sitemap)\s*:\s*(.+)$/i.exec(line);
    if (!m) continue;
    const [, key, value] = m;
    const v = value!.trim();
    if (!v) continue;
    if (key!.toLowerCase() === 'sitemap') sitemaps.add(v);
    else if (v.startsWith('/')) paths.add(`${base}${v}`);
  }
  return { paths: [...paths], sitemaps: [...sitemaps] };
}

export const robotsCheck = defineCheck({
  id: 'http.robots',
  phase: 'enumeration',
  mode: 'active',
  risk: 'low',
  inputs: ['domain', 'subdomain'],
  produces: ['url'],
  source: 'live request to /robots.txt',
  needsKey: false,
  title: 'robots.txt keşfi',
  description: 'robots.txt’teki Disallow yolları ve sitemap’leri toplar.',
  run: async (target, ctx) => {
    const res = await probePath(ctx, target, '/robots.txt');
    if (!res || res.status !== 200 || /<html/i.test(res.text)) return { status: 'clean' };
    const base = `${res.scheme}://${target.value}`;
    const { paths, sitemaps } = parseRobots(res.text, base);
    const urls = [...paths, ...sitemaps];
    if (urls.length === 0) return { status: 'clean' };
    const entities: EntityInput[] = urls.map((u) => ({ type: 'url', value: u }));
    const edges: EdgeInput[] = urls.map((u) => ({
      from: target,
      to: { type: 'url', value: u },
      relation: 'references',
    }));
    return {
      status: 'observation',
      entities,
      edges,
      observations: [{ kind: 'http.robots', entity: target, data: { paths, sitemaps } }],
    };
  },
});
