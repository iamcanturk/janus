import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { caaCheck } from '../src/recon/caa.js';
import { reverseDnsCheck, reverseName } from '../src/recon/reverseDns.js';
import { asnCheck } from '../src/scope/asn.js';
import { gitExposureCheck } from '../src/exposure/gitExposure.js';
import { envExposureCheck } from '../src/exposure/envExposure.js';
import { robotsCheck, parseRobots } from '../src/enumeration/robots.js';
import { securityTxtCheck } from '../src/exposure/securityTxt.js';
import { makeContext, jsonResponse, on } from './helpers.js';

const domain = { type: 'domain', value: 'example.com' } as const;
const ip = { type: 'ip', value: '203.0.113.9' } as const;

const doh = (data: string[], type: number) => ({
  Status: 0,
  Answer: data.map((d) => ({ name: 'x', type, data: d })),
});
const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain' } });

describe('dns.caa', () => {
  it('reports CAA records', async () => {
    const ctx = makeContext(on('type=CAA', jsonResponse(doh(['0 issue "letsencrypt.org"'], 257))));
    const res = await caaCheck.run(domain, ctx, {});
    assert.equal(res.status, 'observation');
  });
});

describe('net.reverse_dns', () => {
  it('builds the in-addr.arpa name and emits a domain entity', async () => {
    assert.equal(reverseName('1.2.3.4'), '4.3.2.1.in-addr.arpa');
    const ctx = makeContext(on('in-addr.arpa', jsonResponse(doh(['host.example.com.'], 12))));
    const res = await reverseDnsCheck.run(ip, ctx, {});
    assert.ok(res.entities?.some((e) => e.type === 'domain' && e.value === 'host.example.com'));
  });
});

describe('net.asn', () => {
  it('emits an asn entity from RIPEstat', async () => {
    const ctx = makeContext(
      on('ripe.net', jsonResponse({ data: { asns: ['13335'], prefix: '203.0.113.0/24' } })),
    );
    const res = await asnCheck.run(ip, ctx, {});
    assert.ok(res.entities?.some((e) => e.type === 'asn' && e.value === 'AS13335'));
  });
});

describe('http.git_exposure', () => {
  it('flags an exposed .git/HEAD', async () => {
    const ctx = makeContext(on('/.git/HEAD', text('ref: refs/heads/main\n')));
    const res = await gitExposureCheck.run(domain, ctx, {});
    assert.equal(res.status, 'finding');
    assert.equal(res.findings?.[0]?.code, 'exposure.git');
  });
  it('is clean for an HTML catch-all', async () => {
    const ctx = makeContext(on('/.git/HEAD', text('<html>404</html>')));
    assert.equal((await gitExposureCheck.run(domain, ctx, {})).status, 'clean');
  });
});

describe('http.env_exposure', () => {
  it('flags an exposed .env with KEY=VALUE lines', async () => {
    const ctx = makeContext(on('/.env', text('APP_ENV=prod\nAPI_KEY=secret123\n')));
    const res = await envExposureCheck.run(domain, ctx, {});
    assert.equal(res.status, 'finding');
    assert.equal(res.findings?.[0]?.severity, 'critical');
  });
  it('ignores an HTML page', async () => {
    const ctx = makeContext(on('/.env', text('<!doctype html><html></html>')));
    assert.equal((await envExposureCheck.run(domain, ctx, {})).status, 'clean');
  });
});

describe('http.robots', () => {
  it('parses Disallow paths and sitemaps', () => {
    const { paths, sitemaps } = parseRobots(
      'User-agent: *\nDisallow: /admin\nSitemap: https://x/sitemap.xml',
      'https://x',
    );
    assert.deepEqual(paths, ['https://x/admin']);
    assert.deepEqual(sitemaps, ['https://x/sitemap.xml']);
  });
  it('emits url entities', async () => {
    const ctx = makeContext(on('/robots.txt', text('Disallow: /secret\n')));
    const res = await robotsCheck.run(domain, ctx, {});
    assert.ok(res.entities?.some((e) => e.type === 'url'));
  });
});

describe('http.security_txt', () => {
  it('reports the contact when present', async () => {
    const ctx = makeContext(on('security.txt', text('Contact: mailto:security@example.com\n')));
    const res = await securityTxtCheck.run(domain, ctx, {});
    assert.equal(res.status, 'observation');
  });
});
