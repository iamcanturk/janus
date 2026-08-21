/**
 * net.asn — ASN / network ownership for an IP via RIPEstat (keyless). Passive.
 * Answers "who announces this IP?" — part of scope/ownership.
 */

import { defineCheck } from '@janus/core';
import type { EntityInput, EdgeInput, Observation } from '@janus/core';
import { fetchJson, HttpError } from '../http.js';

interface RipeNetworkInfo {
  readonly data?: { readonly asns?: string[]; readonly prefix?: string };
}

export const asnCheck = defineCheck({
  id: 'net.asn',
  phase: 'scope',
  mode: 'passive',
  inputs: ['ip'],
  produces: ['asn'],
  source: 'RIPEstat (network-info)',
  needsKey: false,
  title: 'ASN / ağ sahipliği',
  description: 'IP’yi hangi ASN’in duyurduğunu ve ağ blokunu (prefix) bulur.',
  run: async (target, ctx) => {
    const url = `https://stat.ripe.net/data/network-info/data.json?resource=${encodeURIComponent(target.value)}`;
    let info: RipeNetworkInfo;
    try {
      info = await fetchJson<RipeNetworkInfo>(ctx, url);
    } catch (err) {
      if (err instanceof HttpError) return { status: 'skipped' };
      throw err;
    }
    const asns = info.data?.asns ?? [];
    const prefix = info.data?.prefix;
    if (asns.length === 0) return { status: 'clean' };

    const entities: EntityInput[] = asns.map((a) => ({ type: 'asn', value: `AS${a}` }));
    const edges: EdgeInput[] = asns.map((a) => ({
      from: target,
      to: { type: 'asn', value: `AS${a}` },
      relation: 'announced_by',
    }));
    const observations: Observation[] = [
      { kind: 'net.asn', entity: target, data: { asns: asns.map((a) => `AS${a}`), prefix } },
    ];
    return { status: 'observation', entities, edges, observations };
  },
});
