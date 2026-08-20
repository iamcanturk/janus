import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, renderReport, sha256Hex } from '../src/index.js';
import type { ReportInput } from '../src/index.js';

const base: ReportInput = {
  target: { type: 'domain', value: 'example.com' },
  profileId: 'pasif-recon',
  generatedAt: '2026-08-21T10:00:00.000Z',
  counts: { tasks: 3, entities: 10, edges: 9, observations: 4, findings: 2 },
  entityTypes: { domain: 1, subdomain: 5, ip: 4 },
  findings: [
    {
      code: 'dns.spf_missing',
      title: 'SPF kaydı yok',
      severity: 'low',
      entity: { type: 'domain', value: 'example.com' },
      description: 'SPF yok.',
    },
    {
      code: 'intel.cisa_kev',
      title: 'Aktif sömürülen zafiyet',
      severity: 'critical',
      entity: { type: 'cve', value: 'CVE-2021-1234' },
      description: 'KEV içinde.',
      references: [{ title: 'CISA KEV', url: 'https://example.gov/kev' }],
    },
  ],
  tasks: [
    {
      checkId: 'dns.records',
      status: 'finding',
      target: { type: 'domain', value: 'example.com' },
      durationMs: 120,
    },
    {
      checkId: 'subdomain.crtsh',
      status: 'skipped',
      target: { type: 'domain', value: 'example.com' },
      durationMs: 0,
      skippedReason: 'x',
    },
  ],
};

describe('renderMarkdown', () => {
  it('includes target, summary and orders findings critical-first', () => {
    const md = renderMarkdown(base);
    assert.match(md, /# Janus Tarama Raporu/);
    assert.match(md, /domain:example\.com/);
    assert.match(md, /\*\*2 bulgu\*\*/);
    // critical section appears before low
    assert.ok(md.indexOf('critical') < md.indexOf('low'));
    assert.match(md, /CISA KEV/);
  });

  it('renders the checklist and entity breakdown', () => {
    const md = renderMarkdown(base);
    assert.match(md, /## Kontrol listesi/);
    assert.match(md, /## Varlık dağılımı/);
    assert.match(md, /\| subdomain \| 5 \|/);
  });

  it('says "no findings" when empty', () => {
    const md = renderMarkdown({ ...base, findings: [] });
    assert.match(md, /_Bulgu yok\._/);
  });
});

describe('renderReport integrity', () => {
  it('appends a SHA-256 that matches the body and is stable', async () => {
    const a = await renderReport(base);
    const b = await renderReport(base);
    assert.equal(a.sha256, b.sha256);
    assert.equal(a.sha256, await sha256Hex(renderMarkdown(base)));
    assert.match(a.markdown, new RegExp(a.sha256));
  });

  it('changes the digest when the content changes', async () => {
    const a = await renderReport(base);
    const b = await renderReport({ ...base, target: { type: 'domain', value: 'other.com' } });
    assert.notEqual(a.sha256, b.sha256);
  });
});
