/**
 * http.git_exposure — ACTIVE. Checks for an exposed .git directory
 * (/.git/HEAD), which can leak source and secrets. Never runs passively.
 */

import { defineCheck } from '@janus/core';
import { probePath } from '../net/probe.js';

export const gitExposureCheck = defineCheck({
  id: 'http.git_exposure',
  phase: 'exposure',
  mode: 'active',
  risk: 'medium',
  inputs: ['domain', 'subdomain', 'ip'],
  produces: [],
  source: 'live request to /.git/HEAD',
  needsKey: false,
  title: 'Açık .git dizini',
  description: 'Sunucuda erişilebilir /.git/HEAD olup olmadığını kontrol eder (kaynak sızıntısı).',
  run: async (target, ctx) => {
    const res = await probePath(ctx, target, '/.git/HEAD');
    if (!res) return { status: 'clean' };
    const looksLikeGit = res.status === 200 && /^ref:\s|^[0-9a-f]{40}\b/m.test(res.text.trim());
    if (!looksLikeGit) return { status: 'clean' };
    return {
      status: 'finding',
      findings: [
        {
          code: 'exposure.git',
          title: 'Açık .git dizini',
          severity: 'high',
          entity: target,
          description:
            '/.git/HEAD dışarıdan erişilebilir. Depo geçmişi ve olası secret’lar sızabilir.',
          evidence: { head: res.text.trim().slice(0, 120) },
        },
      ],
    };
  },
});
