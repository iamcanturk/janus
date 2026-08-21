/**
 * net.reverse_dns — PTR (reverse DNS) for an IP. Passive (DoH). Produces the
 * hostname as a domain entity so the scan can pivot back to names.
 */

import { defineCheck } from '@janus/core';
import type { EntityInput, EdgeInput } from '@janus/core';
import { dohQuery } from '../net/doh.js';

export function reverseName(ip: string): string {
  return `${ip.split('.').reverse().join('.')}.in-addr.arpa`;
}

export const reverseDnsCheck = defineCheck({
  id: 'net.reverse_dns',
  phase: 'recon',
  mode: 'passive',
  inputs: ['ip'],
  produces: ['domain'],
  source: 'DNS-over-HTTPS (Cloudflare)',
  needsKey: false,
  title: 'Reverse DNS (PTR)',
  description: 'IP’nin PTR kaydından ana bilgisayar adını çözer.',
  run: async (target, ctx) => {
    const rows = await dohQuery(ctx, reverseName(target.value), 'PTR');
    const hosts = rows.map((r) => r.data.replace(/\.$/, '').toLowerCase()).filter(Boolean);
    if (hosts.length === 0) return { status: 'clean' };
    const entities: EntityInput[] = hosts.map((h) => ({ type: 'domain', value: h }));
    const edges: EdgeInput[] = hosts.map((h) => ({
      from: target,
      to: { type: 'domain', value: h },
      relation: 'resolves_to',
    }));
    return {
      status: 'observation',
      entities,
      edges,
      observations: [{ kind: 'dns.ptr', entity: target, data: { hosts } }],
    };
  },
});
