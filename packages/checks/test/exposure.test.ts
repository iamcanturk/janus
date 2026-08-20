import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runScan, CheckRegistry } from '@janus/core';
import type { CheckConfig } from '@janus/core';
import { securityHeadersCheck } from '../src/exposure/securityHeaders.js';
import { tlsHealthCheck } from '../src/exposure/tlsHealth.js';
import { cisaKevCheck, resetKevCache } from '../src/intel/cisaKev.js';
import { internetdbCheck } from '../src/recon/internetdb.js';
import type { CertInfo } from '../src/net/tls.js';
import { makeContext, jsonResponse, on } from './helpers.js';

const domain = { type: 'domain', value: 'example.com' } as const;
const ip = { type: 'ip', value: '203.0.113.9' } as const;

describe('http.security_headers (active)', () => {
  it('flags missing hardening headers', async () => {
    const res = new Response('', {
      headers: {
        'strict-transport-security': 'max-age=63072000',
        'content-security-policy': "default-src 'self'",
      },
    });
    const ctx = makeContext((url) => (url.startsWith('https://') ? res.clone() : undefined));
    const out = await securityHeadersCheck.run(domain, ctx, {});
    assert.equal(out.status, 'finding');
    const codes = (out.findings ?? []).map((f) => f.code).sort();
    assert.deepEqual(codes, [
      'http.header.referrer-policy',
      'http.header.x-content-type-options',
      'http.header.x-frame-options',
    ]);
  });
});

describe('tls.health (active)', () => {
  const cert = (over: Partial<CertInfo>): CertInfo => ({
    selfSigned: false,
    authorized: true,
    daysRemaining: 200,
    validTo: 'Jan 1 2030',
    issuer: 'CA',
    subject: 'example.com',
    ...over,
  });
  const configWith = (info: CertInfo): CheckConfig => ({
    options: { tlsConnect: async () => info },
  });

  it('flags an expired certificate', async () => {
    const out = await tlsHealthCheck.run(
      domain,
      makeContext(),
      configWith(cert({ daysRemaining: -5 })),
    );
    assert.equal(out.status, 'finding');
    assert.equal(out.findings?.[0]?.code, 'tls.expired');
  });

  it('flags a self-signed certificate', async () => {
    const out = await tlsHealthCheck.run(
      domain,
      makeContext(),
      configWith(cert({ selfSigned: true })),
    );
    assert.ok((out.findings ?? []).some((f) => f.code === 'tls.self_signed'));
  });

  it('is a plain observation for a healthy certificate', async () => {
    const out = await tlsHealthCheck.run(domain, makeContext(), configWith(cert({})));
    assert.equal(out.status, 'observation');
    assert.equal(out.findings?.length ?? 0, 0);
  });
});

describe('intel.cisa_kev (passive)', () => {
  it('raises a critical finding for a known-exploited CVE', async () => {
    const target = { type: 'cve', value: 'CVE-2021-1234' } as const;
    const config: CheckConfig = { options: { kevIds: ['cve-2021-1234'] } };
    const out = await cisaKevCheck.run(target, makeContext(), config);
    assert.equal(out.status, 'finding');
    assert.equal(out.findings?.[0]?.severity, 'critical');
  });

  it('is clean for a CVE not in the catalog', async () => {
    const target = { type: 'cve', value: 'CVE-2000-0001' } as const;
    const out = await cisaKevCheck.run(target, makeContext(), { options: { kevIds: [] } });
    assert.equal(out.status, 'clean');
  });
});

describe('KEV enrichment pivot (passive, mocked network)', () => {
  it('turns an InternetDB CVE into a CISA KEV critical finding', async () => {
    resetKevCache();
    const reg = new CheckRegistry();
    reg.registerAll([internetdbCheck, cisaKevCheck]);
    const ctx = makeContext(
      on(
        'internetdb.shodan.io',
        jsonResponse({ ip: '203.0.113.9', ports: [443], vulns: ['CVE-2021-1234'] }),
      ),
      on('cisa.gov', jsonResponse({ vulnerabilities: [{ cveID: 'CVE-2021-1234' }] })),
    );
    const report = await runScan(reg, 'pasif-recon', ip, { context: ctx });
    const codes = new Set(report.findings.map((f) => f.code));
    assert.ok(codes.has('intel.known_vuln'));
    assert.ok(codes.has('intel.cisa_kev'));
    resetKevCache();
  });
});
