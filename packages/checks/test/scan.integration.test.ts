import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runScan } from '@janus/core';
import { createRegistry } from '../src/index.js';
import { makeContext, jsonResponse, on } from './helpers.js';

/**
 * End-to-end passive scan with every network call mocked. Proves the pivot:
 * domain -> (crt.sh) subdomain, domain -> (dns) ip, ip -> (internetdb) ports+cve,
 * and that findings surface (missing SPF/DMARC + known vuln).
 */
describe('passive scan integration (mocked network)', () => {
  it('pivots domain -> subdomain / ip -> ports and yields findings', async () => {
    const dohEmpty = { Status: 0, Answer: [] };
    const aRecord = { Status: 0, Answer: [{ name: 'example.com', type: 1, data: '203.0.113.5' }] };

    const ctx = makeContext(
      on('crt.sh', jsonResponse([{ name_value: 'www.example.com' }])),
      on(
        'rdap.org',
        jsonResponse({
          entities: [{ roles: ['registrar'], vcardArray: ['vcard', [['fn', {}, 'text', 'Acme']]] }],
        }),
      ),
      on('web.archive.org', jsonResponse([['original'], ['http://example.com/old']])),
      on(
        'internetdb.shodan.io',
        jsonResponse({ ip: '203.0.113.5', ports: [443], vulns: ['CVE-2021-1234'] }),
      ),
      on('type=A', jsonResponse(aRecord)),
      // MX/NS/TXT/_dmarc all empty -> SPF + DMARC findings on the apex.
      (url) => (url.includes('cloudflare-dns') ? jsonResponse(dohEmpty).clone() : undefined),
    );

    const report = await runScan(
      createRegistry(),
      'pasif-recon',
      { type: 'domain', value: 'example.com' },
      {
        context: ctx,
      },
    );

    const types = new Set(report.entities.map((e) => e.type));
    for (const t of ['domain', 'subdomain', 'ip', 'port', 'cve', 'org', 'url']) {
      assert.ok(types.has(t), `expected a "${t}" entity in the graph`);
    }

    const codes = new Set(report.findings.map((f) => f.code));
    assert.ok(codes.has('dns.spf_missing'));
    assert.ok(codes.has('dns.dmarc_missing'));
    assert.ok(codes.has('intel.known_vuln'));

    // No active checks ran (passive profile).
    assert.equal(
      report.tasks.every((t) => t.mode === 'passive'),
      true,
    );
  });
});
