/**
 * wayback.urls — historical URLs from the Wayback Machine CDX API. Passive:
 * reads an archive, never requests the target. Useful for surfacing forgotten
 * endpoints, parameters and paths.
 */

import { defineCheck } from '@janus/core';
import type { EntityInput, EdgeInput } from '@janus/core';
import { fetchJson, HttpError } from '../http.js';

const MAX_URLS = 500;

/** CDX returns an array of rows; the first row is the column header. */
export function parseCdx(rows: readonly (readonly string[])[]): string[] {
  if (rows.length <= 1) return [];
  const out = new Set<string>();
  for (const row of rows.slice(1)) {
    const original = row[0];
    if (original) out.add(original);
  }
  return [...out];
}

export const waybackCheck = defineCheck({
  id: 'wayback.urls',
  phase: 'recon',
  mode: 'passive',
  inputs: ['domain'],
  produces: ['url'],
  source: 'Wayback Machine (CDX API)',
  needsKey: false,
  title: 'Arşiv URL keşfi (Wayback)',
  description: 'Wayback Machine arşivinden geçmiş URL/endpoint toplama.',
  run: async (target, ctx) => {
    const url =
      `https://web.archive.org/cdx/search/cdx?url=*.${encodeURIComponent(target.value)}/*` +
      `&output=json&fl=original&collapse=urlkey&limit=${MAX_URLS}`;

    let rows: string[][];
    try {
      rows = await fetchJson<string[][]>(ctx, url);
    } catch (err) {
      if (err instanceof HttpError) return { status: 'skipped' };
      throw err;
    }

    const urls = parseCdx(rows);
    if (urls.length === 0) return { status: 'clean' };

    const entities: EntityInput[] = urls.map((value) => ({ type: 'url', value }));
    const edges: EdgeInput[] = urls.map((value) => ({
      from: target,
      to: { type: 'url', value },
      relation: 'references',
    }));

    return {
      status: 'observation',
      entities,
      edges,
      observations: [
        {
          kind: 'wayback.count',
          entity: target,
          data: { count: urls.length },
          message: `${urls.length} arşiv URL bulundu`,
        },
      ],
    };
  },
});
