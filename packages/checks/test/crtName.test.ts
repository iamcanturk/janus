import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { crtNameCheck, extractSubdomains } from '../src/recon/crtName.js';
import { makeContext, errorResponse } from './helpers.js';

const domain = { type: 'domain', value: 'example.com' } as const;

function textResponse(body: string): Response {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/plain' } });
}

describe('extractSubdomains', () => {
  it('keeps apex subdomains, drops the apex/wildcards/foreign domains', () => {
    const text = 'www.example.com\n*.example.com\napi.example.com\nexample.com\nevil.com\n';
    assert.deepEqual(extractSubdomains(text, 'example.com'), [
      'api.example.com',
      'www.example.com',
    ]);
  });
});

describe('subdomain.crtname', () => {
  it('produces subdomain entities and subdomain_of edges', async () => {
    const ctx = makeContext((url) =>
      url.includes('crt.name') ? textResponse('a.example.com\nb.example.com\n') : undefined,
    );
    const res = await crtNameCheck.run(domain, ctx, {});
    assert.equal(res.status, 'observation');
    assert.equal(res.entities?.length, 2);
    assert.ok(res.edges?.every((e) => e.relation === 'subdomain_of'));
  });

  it('skips gracefully on an HTTP error', async () => {
    const res = await crtNameCheck.run(
      domain,
      makeContext(() => errorResponse(502)),
      {},
    );
    assert.equal(res.status, 'skipped');
  });
});
