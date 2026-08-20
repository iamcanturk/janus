import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nullLogger } from '@janus/core';
import type { CheckContext } from '@janus/core';
import { encryptSecret, decryptSecret, vtDomainReport, shodanHost } from '../src/index.js';

function ctxWith(json: unknown, ok = true): CheckContext {
  const fetchStub: typeof fetch = async () =>
    new Response(JSON.stringify(json), { status: ok ? 200 : 401 });
  return { logger: nullLogger, getKey: () => undefined, fetch: fetchStub };
}

describe('encryptSecret / decryptSecret', () => {
  it('round-trips a secret', () => {
    const token = encryptSecret('super-secret-key', 'passphrase');
    assert.notEqual(token, 'super-secret-key');
    assert.equal(decryptSecret(token, 'passphrase'), 'super-secret-key');
  });

  it('fails to decrypt with the wrong passphrase', () => {
    const token = encryptSecret('x', 'right');
    assert.throws(() => decryptSecret(token, 'wrong'));
  });

  it('fails on tampered ciphertext', () => {
    const token = encryptSecret('x', 'p');
    const parts = token.split('.');
    parts[2] = Buffer.from('tampered').toString('base64');
    assert.throws(() => decryptSecret(parts.join('.'), 'p'));
  });
});

describe('vtDomainReport', () => {
  it('parses last_analysis_stats', async () => {
    const ctx = ctxWith({
      data: {
        attributes: {
          last_analysis_stats: { malicious: 2, suspicious: 1, harmless: 60 },
          reputation: -3,
        },
      },
    });
    const report = await vtDomainReport(ctx, 'key', 'evil.com');
    assert.equal(report?.malicious, 2);
    assert.equal(report?.reputation, -3);
  });

  it('returns undefined on a bad key (non-2xx)', async () => {
    const report = await vtDomainReport(ctxWith({}, false), 'bad', 'x.com');
    assert.equal(report, undefined);
  });
});

describe('shodanHost', () => {
  it('normalizes ports and vulns (object or array)', async () => {
    const ctx = ctxWith({
      ports: [22, 443],
      vulns: { 'CVE-2021-1': {} },
      org: 'ACME',
      hostnames: ['h'],
    });
    const host = await shodanHost(ctx, 'key', '1.2.3.4');
    assert.deepEqual(host?.ports, [22, 443]);
    assert.deepEqual(host?.vulns, ['CVE-2021-1']);
    assert.equal(host?.org, 'ACME');
  });
});
