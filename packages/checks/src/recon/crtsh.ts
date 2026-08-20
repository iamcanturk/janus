/**
 * subdomain.crtsh — subdomain enumeration via crt.sh Certificate Transparency
 * logs. Passive: queries a third-party CT aggregator, never touches the target.
 */

import { defineCheck } from '@janus/core';
import type { EntityInput, EdgeInput } from '@janus/core';
import { fetchJson, HttpError } from '../http.js';

interface CrtShRow {
  readonly name_value?: string;
  readonly common_name?: string;
}

/** Extract unique subdomains of `domain` from crt.sh rows. */
export function extractSubdomains(rows: readonly CrtShRow[], domain: string): string[] {
  const apex = domain.trim().toLowerCase();
  const out = new Set<string>();
  for (const row of rows) {
    const names = `${row.name_value ?? ''}\n${row.common_name ?? ''}`.split('\n');
    for (const raw of names) {
      const name = raw.trim().toLowerCase().replace(/^\*\./, '');
      if (!name || name === apex) continue;
      if (name === apex || name.endsWith(`.${apex}`)) out.add(name);
    }
  }
  return [...out].sort();
}

export const crtshCheck = defineCheck({
  id: 'subdomain.crtsh',
  phase: 'recon',
  mode: 'passive',
  inputs: ['domain'],
  produces: ['subdomain'],
  source: 'crt.sh (Certificate Transparency logs)',
  needsKey: false,
  title: 'Subdomain keşfi (crt.sh)',
  description: 'Certificate Transparency loglarından pasif subdomain toplama.',
  run: async (target, ctx) => {
    const url = `https://crt.sh/?q=%25.${encodeURIComponent(target.value)}&output=json`;
    let rows: CrtShRow[];
    try {
      rows = await fetchJson<CrtShRow[]>(ctx, url);
    } catch (err) {
      if (err instanceof HttpError) return { status: 'skipped' };
      throw err;
    }

    const subdomains = extractSubdomains(rows, target.value);
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
