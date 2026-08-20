import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import {
  toBase64,
  fromBase64,
  toHex,
  fromHex,
  urlEncode,
  urlDecode,
  defang,
  refang,
  hash,
  hashAll,
  identifyHash,
  decodeJwt,
  parseCidr,
  extractIocs,
} from '../src/index.js';

describe('encoding round-trips', () => {
  it('base64 handles unicode', () => {
    const s = 'Merhaba 🌍 dünya';
    assert.equal(fromBase64(toBase64(s)), s);
    assert.equal(toBase64('abc'), 'YWJj');
  });

  it('hex round-trips and rejects bad input', () => {
    assert.equal(toHex('AB'), '4142');
    assert.equal(fromHex('4142'), 'AB');
    assert.throws(() => fromHex('abc'), /even/);
  });

  it('url encode/decode', () => {
    assert.equal(urlEncode('a b&c'), 'a%20b%26c');
    assert.equal(urlDecode('a%20b%26c'), 'a b&c');
  });

  it('defang/refang round-trips a URL', () => {
    const url = 'http://evil.example.com/path';
    const fanged = defang(url);
    assert.ok(fanged.includes('hxxp') && fanged.includes('[.]'));
    assert.equal(refang(fanged), url);
  });
});

describe('hash', () => {
  it('computes a known SHA-256', async () => {
    assert.equal(
      await hash('SHA-256', 'abc'),
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashAll returns every algorithm', async () => {
    const all = await hashAll('x');
    assert.equal(Object.keys(all).length, 4);
    assert.equal(all['SHA-1'].length, 40);
  });

  it('identifies a hash by length', () => {
    assert.deepEqual(identifyHash('a'.repeat(64)), ['SHA-256']);
    assert.deepEqual(identifyHash('nothex!!'), []);
  });
});

describe('decodeJwt', () => {
  const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  it('decodes header + payload and warns on alg:none', () => {
    const token = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub: '123' })}.`;
    const decoded = decodeJwt(token);
    assert.equal(decoded.header.alg, 'none');
    assert.equal(decoded.payload.sub, '123');
    assert.ok(decoded.warnings.some((w) => w.includes('alg: none')));
  });

  it('rejects a malformed token', () => {
    assert.throws(() => decodeJwt('not-a-jwt'), /three/);
  });
});

describe('parseCidr', () => {
  it('computes a /24', () => {
    const info = parseCidr('192.168.1.10/24');
    assert.equal(info.network, '192.168.1.0');
    assert.equal(info.broadcast, '192.168.1.255');
    assert.equal(info.netmask, '255.255.255.0');
    assert.equal(info.firstHost, '192.168.1.1');
    assert.equal(info.lastHost, '192.168.1.254');
    assert.equal(info.usableHosts, 254);
  });

  it('handles a /32 host route', () => {
    const info = parseCidr('10.0.0.5/32');
    assert.equal(info.totalAddresses, 1);
    assert.equal(info.usableHosts, 1);
    assert.equal(info.network, '10.0.0.5');
  });

  it('rejects a bad prefix and octet', () => {
    assert.throws(() => parseCidr('1.2.3.4/33'), /Prefix/);
    assert.throws(() => parseCidr('1.2.3.999/24'), /octet/);
  });
});

describe('extractIocs', () => {
  it('extracts refanged indicators from text', () => {
    const text =
      'Contact evil[at]bad[.]com from hxxp://mal[.]example[.]com and 8[.]8[.]8[.]8, hash ' +
      'd41d8cd98f00b204e9800998ecf8427e';
    const iocs = extractIocs(text);
    assert.ok(iocs.ipv4.includes('8.8.8.8'));
    assert.ok(iocs.urls.some((u) => u.includes('mal.example.com')));
    assert.ok(iocs.emails.includes('evil@bad.com'));
    assert.ok(iocs.md5.includes('d41d8cd98f00b204e9800998ecf8427e'));
  });
});
