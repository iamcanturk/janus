/**
 * tls.health — ACTIVE. Inspects the target's TLS certificate and flags an
 * expired, soon-to-expire or self-signed certificate. Never runs in a passive
 * profile (runner safety gate). The connector is injectable via
 * `config.options.tlsConnect` so tests open no real connection.
 */

import { defineCheck } from '@janus/core';
import type { EntityInput, EdgeInput, Finding, Observation } from '@janus/core';
import { tlsConnect } from '../net/tls.js';
import type { TlsConnect } from '../net/tls.js';

const EXPIRY_WARN_DAYS = 14;
const DEFAULT_TIMEOUT_MS = 6000;

export const tlsHealthCheck = defineCheck({
  id: 'tls.health',
  phase: 'exposure',
  mode: 'active',
  risk: 'low',
  inputs: ['domain', 'subdomain'],
  produces: ['certificate'],
  source: 'live TLS handshake with target',
  needsKey: false,
  title: 'TLS sertifika sağlığı',
  description: 'Sertifika geçerlilik süresi, yakın sona erme ve self-signed kontrolü.',
  run: async (target, _ctx, config) => {
    const options = config.options ?? {};
    const connect = (options.tlsConnect as TlsConnect | undefined) ?? tlsConnect;
    const timeoutMs = (options.tlsTimeoutMs as number | undefined) ?? DEFAULT_TIMEOUT_MS;

    const cert = await connect(target.value, 443, timeoutMs);
    if (!cert) return { status: 'clean' };

    const certValue = `${target.value}:443`;
    const entities: EntityInput[] = [
      {
        type: 'certificate',
        value: certValue,
        meta: { issuer: cert.issuer, subject: cert.subject, validTo: cert.validTo },
      },
    ];
    const edges: EdgeInput[] = [
      { from: target, to: { type: 'certificate', value: certValue }, relation: 'serves' },
    ];
    const observations: Observation[] = [
      {
        kind: 'tls.certificate',
        entity: target,
        data: {
          issuer: cert.issuer,
          subject: cert.subject,
          validTo: cert.validTo,
          daysRemaining: cert.daysRemaining,
          authorized: cert.authorized,
        },
      },
    ];

    const findings: Finding[] = [];
    if (typeof cert.daysRemaining === 'number') {
      if (cert.daysRemaining < 0) {
        findings.push({
          code: 'tls.expired',
          title: 'TLS sertifikası süresi dolmuş',
          severity: 'high',
          entity: target,
          description: `Sertifika ${Math.abs(cert.daysRemaining)} gün önce sona ermiş (${cert.validTo}).`,
        });
      } else if (cert.daysRemaining <= EXPIRY_WARN_DAYS) {
        findings.push({
          code: 'tls.expiring_soon',
          title: 'TLS sertifikası yakında sona eriyor',
          severity: 'medium',
          entity: target,
          description: `Sertifika ${cert.daysRemaining} gün içinde sona erecek (${cert.validTo}).`,
        });
      }
    }
    if (cert.selfSigned) {
      findings.push({
        code: 'tls.self_signed',
        title: 'Self-signed TLS sertifikası',
        severity: 'medium',
        entity: target,
        description: 'Sertifika kendinden imzalı; güvenilir bir CA tarafından doğrulanmıyor.',
      });
    }

    if (findings.length > 0) return { status: 'finding', entities, edges, observations, findings };
    return { status: 'observation', entities, edges, observations };
  },
});
