import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ScanDiff } from '@janus/core';
import { renderDiffMarkdown, summarizeDiff } from '../src/index.js';

const meta = {
  target: { type: 'domain', value: 'example.com' },
  profileId: 'kendi-varligim-monitor',
  generatedAt: '2026-08-21T10:00:00.000Z',
};

const changed: ScanDiff = {
  addedEntities: [{ id: 'subdomain:new.example.com', type: 'subdomain', value: 'new.example.com' }],
  removedEntities: [],
  addedFindings: [
    {
      code: 'intel.cisa_kev',
      title: 'KEV',
      severity: 'critical',
      entity: { type: 'cve', value: 'CVE-1' },
      description: 'x',
    },
  ],
  removedFindings: [],
  changed: true,
};

const same: ScanDiff = {
  addedEntities: [],
  removedEntities: [],
  addedFindings: [],
  removedFindings: [],
  changed: false,
};

describe('summarizeDiff', () => {
  it('summarizes changes in one line', () => {
    assert.match(summarizeDiff(changed, meta), /\+1 varlık.*\+1 bulgu/);
  });
  it('reports no change', () => {
    assert.match(summarizeDiff(same, meta), /değişiklik yok/);
  });
});

describe('renderDiffMarkdown', () => {
  it('lists new entities and findings', () => {
    const md = renderDiffMarkdown(changed, meta);
    assert.match(md, /Yeni bulgular/);
    assert.match(md, /new\.example\.com/);
  });
  it('says no change when unchanged', () => {
    assert.match(renderDiffMarkdown(same, meta), /değişiklik yok/);
  });
});
