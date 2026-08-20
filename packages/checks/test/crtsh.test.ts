import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { crtshCheck, extractSubdomains } from '../src/recon/crtsh.js';
import { makeContext, jsonResponse, on, errorResponse } from './helpers.js';

const domain = { type: 'domain', value: 'example.com' } as const;

describe('extractSubdomains', () => {
  it('dedups, strips wildcards, drops the apex, filters foreign domains', () => {
    const rows = [
      { name_value: 'www.example.com\n*.example.com' },
      { name_value: 'api.example.com', common_name: 'example.com' },
      { name_value: 'evil.com' },
    ];
    assert.deepEqual(extractSubdomains(rows, 'example.com'), [
      'api.example.com',
      'www.example.com',
    ]);
  });
});

describe('subdomain.crtsh', () => {
  it('produces subdomain entities and a subdomain_of edge', async () => {
    const ctx = makeContext(
      on(
        'crt.sh',
        jsonResponse([{ name_value: 'www.example.com' }, { name_value: 'api.example.com' }]),
      ),
    );
    const res = await crtshCheck.run(domain, ctx, {});
    assert.equal(res.status, 'observation');
    assert.equal(res.entities?.length, 2);
    assert.ok(res.edges?.every((e) => e.relation === 'subdomain_of'));
  });

  it('skips gracefully on an HTTP error', async () => {
    const ctx = makeContext(() => errorResponse(502));
    const res = await crtshCheck.run(domain, ctx, {});
    assert.equal(res.status, 'skipped');
  });
});
