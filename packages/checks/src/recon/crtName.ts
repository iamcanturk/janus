/**
 * subdomain.crtname — subdomain enumeration via crt.name, a fast Certificate
 * Transparency aggregator (a reliable replacement for the often-timing-out
 * crt.sh). Passive: queries a third-party index, never touches the target.
 *
 * The API returns newline-separated hostnames as plain text.
 */

import { defineCheck } from '@janus/core';
import type { EntityInput, EdgeInput } from '@janus/core';
import { fetchText, HttpError } from '../http.js';

/** Keep hostnames that belong to the apex; drop the apex itself and wildcards. */
export function extractSubdomains(text: string, domain: string): string[] {
  const apex = domain.trim().toLowerCase();
  const out = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const name = raw.trim().toLowerCase().replace(/^\*\./, '');
    if (!name || name === apex) continue;
    if (name.endsWith(`.${apex}`)) out.add(name);
  }
  return [...out].sort();
}

export const crtNameCheck = defineCheck({
  id: 'subdomain.crtname',
  phase: 'recon',
  mode: 'passive',
  inputs: ['domain'],
  produces: ['subdomain'],
  source: 'crt.name (Certificate Transparency aggregator)',
  needsKey: false,
  title: 'Subdomain keşfi (crt.name)',
  description: 'Certificate Transparency loglarından pasif subdomain toplama.',
  run: async (target, ctx) => {
    const url = `https://crt.name/v1/search?apex=${encodeURIComponent(target.value)}`;
    let text: string;
    try {
      text = await fetchText(ctx, url);
    } catch (err) {
      if (err instanceof HttpError) return { status: 'skipped' };
      throw err;
    }

    const subdomains = extractSubdomains(text, target.value);
    if (subdomains.length === 0) return { status: 'clean' };

    const entities: EntityInput[] = subdomains.map((value) => ({ type: 'subdomain', value }));
    const edges: EdgeInput[] = subdomains.map((value) => ({
      from: { type: 'subdomain', value },
      to: target,
      relation: 'subdomain_of',
    }));

    return {
      status: 'observation',
      entities,
      edges,
      observations: [
        {
          kind: 'subdomain.count',
          entity: target,
          data: { count: subdomains.length },
          message: `${subdomains.length} subdomain bulundu`,
        },
      ],
    };
  },
});
