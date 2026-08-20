import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderHtml, escapeHtml } from '../src/index.js';
import type { ReportInput } from '../src/index.js';

const input: ReportInput = {
  target: { type: 'domain', value: 'example.com' },
  profileId: 'pasif-recon',
  generatedAt: '2026-08-21T10:00:00.000Z',
  counts: { tasks: 2, entities: 3, edges: 2, observations: 1, findings: 1 },
  entityTypes: { domain: 1, ip: 2 },
  findings: [
    {
      code: 'dns.spf_missing',
      title: 'SPF kaydı yok',
      severity: 'low',
      entity: { type: 'domain', value: 'example.com' },
      description: 'SPF <script>alert(1)</script> yok.',
    },
  ],
};

describe('escapeHtml', () => {
  it('escapes HTML metacharacters', () => {
    assert.equal(escapeHtml('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;');
  });
});

describe('renderHtml', () => {
  it('is a standalone document containing the findings', () => {
    const html = renderHtml(input);
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /SPF kaydı yok/);
    assert.match(html, /example\.com/);
  });

  it('escapes finding text (no raw script tag)', () => {
    const html = renderHtml(input);
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.match(html, /&lt;script&gt;/);
  });
});
