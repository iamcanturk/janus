/**
 * dns.caa — CAA records (which CAs may issue certificates for the domain).
 * Passive (DoH). Absence is an observation, not a finding.
 */

import { defineCheck } from '@janus/core';
import { dohQuery, unquote } from '../net/doh.js';

export const caaCheck = defineCheck({
  id: 'dns.caa',
  phase: 'recon',
  mode: 'passive',
  inputs: ['domain'],
  produces: [],
  source: 'DNS-over-HTTPS (Cloudflare)',
  needsKey: false,
  title: 'CAA kayıtları',
  description: 'Alan adı için sertifika üretebilecek CA’ları listeler (CAA).',
  run: async (target, ctx) => {
    const rows = await dohQuery(ctx, target.value, 'CAA');
    if (rows.length === 0) return { status: 'clean' };
    const records = rows.map((r) => unquote(r.data));
    return {
      status: 'observation',
      observations: [{ kind: 'dns.caa', entity: target, data: { records } }],
    };
  },
});
