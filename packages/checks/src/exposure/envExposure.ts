/**
 * http.env_exposure — ACTIVE. Checks for an exposed .env file at the web root.
 * A hit typically leaks credentials. Never runs passively.
 */

import { defineCheck } from '@janus/core';
import { probePath } from '../net/probe.js';

export const envExposureCheck = defineCheck({
  id: 'http.env_exposure',
  phase: 'exposure',
  mode: 'active',
  risk: 'high',
  inputs: ['domain', 'subdomain', 'ip'],
  produces: [],
  source: 'live request to /.env',
  needsKey: false,
  title: 'Açık .env dosyası',
  description:
    'Web kökünde erişilebilir /.env olup olmadığını kontrol eder (kimlik bilgisi sızıntısı).',
  run: async (target, ctx) => {
    const res = await probePath(ctx, target, '/.env');
    if (!res || res.status !== 200) return { status: 'clean' };
    // Heuristic: real .env has KEY=VALUE lines and isn't an HTML page.
    const isHtml = /<html|<!doctype/i.test(res.text);
    const looksEnv = /^[A-Z][A-Z0-9_]+=.*$/m.test(res.text);
    if (isHtml || !looksEnv) return { status: 'clean' };
    return {
      status: 'finding',
      findings: [
        {
          code: 'exposure.env',
          title: 'Açık .env dosyası',
          severity: 'critical',
          entity: target,
          description:
            '/.env dışarıdan erişilebilir. API anahtarları ve kimlik bilgileri sızabilir.',
          evidence: {
            keys: [...res.text.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]).slice(0, 10),
          },
        },
      ],
    };
  },
});
