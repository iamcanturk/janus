/**
 * http.security_headers — ACTIVE. Sends a live request and checks for the
 * common hardening headers. Missing ones become low/info findings. Never runs
 * in a passive profile (runner safety gate).
 */

import { defineCheck } from '@janus/core';
import type { CheckContext, Finding, Observation, Severity, Target } from '@janus/core';

interface HeaderRule {
  readonly header: string;
  readonly title: string;
  readonly severity: Severity;
  readonly description: string;
}

const RULES: readonly HeaderRule[] = [
  {
    header: 'strict-transport-security',
    title: 'HSTS başlığı yok',
    severity: 'low',
    description: 'Strict-Transport-Security yok; downgrade/SSL-strip saldırılarına açık olabilir.',
  },
  {
    header: 'content-security-policy',
    title: 'CSP başlığı yok',
    severity: 'low',
    description: 'Content-Security-Policy yok; XSS/enjeksiyon etkisini sınırlayan katman eksik.',
  },
  {
    header: 'x-frame-options',
    title: 'X-Frame-Options yok',
    severity: 'info',
    description: 'X-Frame-Options (ya da CSP frame-ancestors) yok; clickjacking riski.',
  },
  {
    header: 'x-content-type-options',
    title: 'X-Content-Type-Options yok',
    severity: 'info',
    description: 'X-Content-Type-Options: nosniff yok; MIME sniffing riski.',
  },
  {
    header: 'referrer-policy',
    title: 'Referrer-Policy yok',
    severity: 'info',
    description: 'Referrer-Policy yok; hassas URL bilgisi sızabilir.',
  },
];

function schemesFor(target: Target): string[] {
  return target.type === 'ip' ? ['http', 'https'] : ['https', 'http'];
}

export const securityHeadersCheck = defineCheck({
  id: 'http.security_headers',
  phase: 'exposure',
  mode: 'active',
  risk: 'low',
  inputs: ['domain', 'subdomain', 'ip'],
  produces: [],
  source: 'live HTTP(S) request to target',
  needsKey: false,
  title: 'Güvenlik başlıkları',
  description: 'Hedefin HTTP güvenlik sertleştirme başlıklarını denetler.',
  run: async (target, ctx: CheckContext) => {
    let headers: Headers | undefined;
    for (const scheme of schemesFor(target)) {
      try {
        const res = await ctx.fetch(`${scheme}://${target.value}`, {
          redirect: 'manual',
          signal: ctx.signal,
        });
        headers = res.headers;
        break;
      } catch {
        // try next scheme
      }
    }
    if (!headers) return { status: 'clean' };

    const present: string[] = [];
    const findings: Finding[] = [];
    for (const rule of RULES) {
      if (headers.has(rule.header)) {
        present.push(rule.header);
      } else {
        findings.push({
          code: `http.header.${rule.header}`,
          title: rule.title,
          severity: rule.severity,
          entity: target,
          description: rule.description,
        });
      }
    }

    const observations: Observation[] = [
      { kind: 'http.security_headers', entity: target, data: { present } },
    ];

    if (findings.length > 0) return { status: 'finding', observations, findings };
    return { status: 'observation', observations };
  },
});
