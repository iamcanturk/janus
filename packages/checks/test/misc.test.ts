import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { waybackCheck, parseCdx } from '../src/recon/wayback.js';
import { rdapCheck, vcardName } from '../src/scope/rdap.js';
import { internetdbCheck } from '../src/recon/internetdb.js';
import { makeContext, jsonResponse, on, errorResponse } from './helpers.js';

const domain = { type: 'domain', value: 'example.com' } as const;
const ip = { type: 'ip', value: '203.0.113.5' } as const;

describe('wayback.urls', () => {
  it('parses CDX rows into unique url entities (dropping the header row)', () => {
    assert.deepEqual(
      parseCdx([
        ['original'],
        ['http://a.example.com/x'],
        ['http://a.example.com/x'],
        ['http://a.example.com/y'],
      ]),
      ['http://a.example.com/x', 'http://a.example.com/y'],
    );
  });

  it('emits url entities from the archive', async () => {
    const ctx = makeContext(
      on(
        'web.archive.org',
        jsonResponse([['original'], ['http://a.example.com/x'], ['http://b.example.com/y']]),
      ),
    );
    const res = await waybackCheck.run(domain, ctx, {});
    assert.equal(res.status, 'observation');
    assert.equal(res.entities?.length, 2);
  });
});

describe('rdap.registration', () => {
  it('extracts a vcard display name', () => {
    const entity = {
      vcardArray: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'Acme Registrar'],
        ],
      ],
    };
    assert.equal(vcardName(entity as never), 'Acme Registrar');
  });

  it('produces an org entity for the registrar', async () => {
    const ctx = makeContext(
      on(
        'rdap.org',
        jsonResponse({
          entities: [
            { roles: ['registrar'], vcardArray: ['vcard', [['fn', {}, 'text', 'Acme Registrar']]] },
          ],
          nameservers: [{ ldhName: 'NS1.EXAMPLE.COM' }],
        }),
      ),
    );
    const res = await rdapCheck.run(domain, ctx, {});
    assert.equal(res.status, 'observation');
    assert.ok(res.entities?.some((e) => e.type === 'org' && e.value === 'Acme Registrar'));
  });
});

describe('shodan.internetdb', () => {
  it('emits port entities and CVE findings', async () => {
    const ctx = makeContext(
      on(
        'internetdb.shodan.io',
        jsonResponse({ ip: '203.0.113.5', ports: [22, 443], vulns: ['CVE-2021-1234'] }),
      ),
    );
    const res = await internetdbCheck.run(ip, ctx, {});
    assert.equal(res.status, 'finding');
    assert.equal(res.entities?.filter((e) => e.type === 'port').length, 2);
    assert.equal(res.findings?.[0]?.code, 'intel.known_vuln');
    assert.equal(res.findings?.[0]?.severity, 'high');
  });

  it('is clean when InternetDB has no record (404)', async () => {
    const ctx = makeContext(() => errorResponse(404));
    const res = await internetdbCheck.run(ip, ctx, {});
    assert.equal(res.status, 'clean');
  });
});
