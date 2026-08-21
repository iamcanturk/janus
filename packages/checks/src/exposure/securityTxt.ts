/**
 * http.security_txt — ACTIVE. Looks for a security.txt (RFC 9116) disclosure
 * policy. Its presence is a good sign; we surface the contact as an observation.
 */

import { defineCheck } from '@janus/core';
import { probePath } from '../net/probe.js';

export const securityTxtCheck = defineCheck({
  id: 'http.security_txt',
  phase: 'exposure',
  mode: 'active',
  risk: 'low',
  inputs: ['domain', 'subdomain'],
  produces: [],
  source: 'live request to /.well-known/security.txt',
  needsKey: false,
  title: 'security.txt',
  description: 'RFC 9116 güvenlik iletişim politikasını (security.txt) arar.',
  run: async (target, ctx) => {
    for (const path of ['/.well-known/security.txt', '/security.txt']) {
      const res = await probePath(ctx, target, path);
      if (res && res.status === 200 && /contact:/i.test(res.text)) {
        const contacts = [...res.text.matchAll(/^Contact:\s*(.+)$/gim)].map((m) => m[1]!.trim());
        return {
          status: 'observation',
          observations: [{ kind: 'http.security_txt', entity: target, data: { path, contacts } }],
        };
      }
    }
    return { status: 'clean' };
  },
});
