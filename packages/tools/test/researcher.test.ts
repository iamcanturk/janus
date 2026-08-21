import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDorks,
  searchUrl,
  SEARCH_ENGINES,
  passwordStrength,
  generatePassword,
  generateToken,
  uuidv4,
  buildTyposquats,
  convertTime,
} from '../src/index.js';

describe('buildDorks', () => {
  it('builds web + github dorks', () => {
    const { web, github } = buildDorks('example.com');
    assert.ok(web.length >= 6 && github.length >= 3);
    assert.ok(web.some((d) => d.query.includes('site:example.com')));
    assert.ok(github[0]!.url!.includes('github.com/search'));
  });

  it('renders a dork query into every engine', () => {
    assert.ok(SEARCH_ENGINES.length >= 6);
    const url = searchUrl(SEARCH_ENGINES[1]!.base, 'site:example.com');
    assert.ok(url.startsWith('https://www.bing.com/search?q='));
    assert.ok(url.includes('site%3Aexample.com'));
  });
});

describe('passwords & tokens', () => {
  it('rates strength by bits', () => {
    assert.equal(passwordStrength('').verdict, '—');
    assert.ok(passwordStrength('aB3$xY9!kLmN2024#').bits > 45);
  });
  it('generates a password of the requested length from the pools', () => {
    const pw = generatePassword({ length: 24, symbols: false });
    assert.equal(pw.length, 24);
    assert.ok(/^[a-zA-Z0-9]+$/.test(pw));
  });
  it('generates hex + base64url tokens and a uuid', () => {
    assert.match(generateToken(16, 'hex'), /^[0-9a-f]{32}$/);
    assert.ok(!generateToken(16, 'base64url').includes('='));
    assert.match(uuidv4(), /^[0-9a-f-]{36}$/);
  });
});

describe('buildTyposquats', () => {
  it('produces look-alike domains keeping the TLD, plus TLD swaps', () => {
    const out = buildTyposquats('google.com');
    assert.ok(out.length > 5);
    assert.ok(out.every((d) => d !== 'google.com'));
    assert.ok(out.includes('google.net'));
  });
});

describe('convertTime', () => {
  const now = Date.parse('2026-08-21T12:00:00.000Z');
  it('parses epoch seconds', () => {
    const info = convertTime('1600000000', now);
    assert.equal(info?.iso, '2020-09-13T12:26:40.000Z');
  });
  it('parses an ISO string and computes relative', () => {
    const info = convertTime('2026-08-21T11:00:00.000Z', now);
    assert.match(info?.relative ?? '', /önce/);
  });
  it('returns null on garbage', () => {
    assert.equal(convertTime('not-a-time', now), null);
  });
});
