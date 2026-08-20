import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dnsCheck } from '../src/recon/dns.js';
import { makeContext, jsonResponse, on } from './helpers.js';

const domain = { type: 'domain', value: 'example.com' } as const;

const answer = (data: string[], type: number) => ({
  Status: 0,
  Answer: data.map((d) => ({ name: 'example.com', type, data: d })),
});

describe('dns.records', () => {
  it('seeds IP entities and raises no finding when SPF + DMARC exist', async () => {
    const ctx = makeContext(
      on('type=A', jsonResponse(answer(['203.0.113.5', '203.0.113.6'], 1))),
      on('type=MX', jsonResponse(answer(['10 mail.example.com'], 15))),
      on('type=NS', jsonResponse(answer(['ns1.example.com'], 2))),
      on('name=_dmarc', jsonResponse(answer(['"v=DMARC1; p=reject"'], 16))),
      on('type=TXT', jsonResponse(answer(['"v=spf1 include:_spf.google.com ~all"'], 16))),
    );
    const res = await dnsCheck.run(domain, ctx, {});
    assert.equal(res.status, 'observation');
    assert.equal(res.entities?.filter((e) => e.type === 'ip').length, 2);
    assert.equal(res.findings?.length ?? 0, 0);
  });

  it('raises SPF + DMARC findings when both are missing', async () => {
    const empty = jsonResponse({ Status: 0, Answer: [] });
    const ctx = makeContext(() => empty.clone());
    const res = await dnsCheck.run(domain, ctx, {});
    assert.equal(res.status, 'finding');
    const codes = (res.findings ?? []).map((f) => f.code).sort();
    assert.deepEqual(codes, ['dns.dmarc_missing', 'dns.spf_missing']);
  });

  it('does not raise SPF/DMARC findings for a subdomain target', async () => {
    const empty = jsonResponse({ Status: 0, Answer: [] });
    const ctx = makeContext(() => empty.clone());
    const res = await dnsCheck.run({ type: 'subdomain', value: 'www.example.com' }, ctx, {});
    assert.equal(res.findings?.length ?? 0, 0);
  });
});
