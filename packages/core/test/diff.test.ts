import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diffReports } from '../src/diff.js';
import type { ScanSnapshot } from '../src/diff.js';
import type { Finding } from '../src/types/finding.js';

const spf: Finding = {
  code: 'dns.spf_missing',
  title: 'SPF yok',
  severity: 'low',
  entity: { type: 'domain', value: 'example.com' },
  description: 'x',
};
const kev: Finding = {
  code: 'intel.cisa_kev',
  title: 'KEV',
  severity: 'critical',
  entity: { type: 'cve', value: 'CVE-1' },
  description: 'x',
};

const prev: ScanSnapshot = {
  entities: [
    { id: 'domain:example.com', type: 'domain', value: 'example.com' },
    { id: 'subdomain:a.example.com', type: 'subdomain', value: 'a.example.com' },
  ],
  findings: [spf],
};

const next: ScanSnapshot = {
  entities: [
    { id: 'domain:example.com', type: 'domain', value: 'example.com' },
    { id: 'subdomain:b.example.com', type: 'subdomain', value: 'b.example.com' },
  ],
  findings: [kev],
};

describe('diffReports', () => {
  it('detects added/removed entities and findings', () => {
    const diff = diffReports(prev, next);
    assert.deepEqual(
      diff.addedEntities.map((e) => e.value),
      ['b.example.com'],
    );
    assert.deepEqual(
      diff.removedEntities.map((e) => e.value),
      ['a.example.com'],
    );
    assert.deepEqual(
      diff.addedFindings.map((f) => f.code),
      ['intel.cisa_kev'],
    );
    assert.deepEqual(
      diff.removedFindings.map((f) => f.code),
      ['dns.spf_missing'],
    );
    assert.equal(diff.changed, true);
  });

  it('reports no change for identical snapshots', () => {
    const diff = diffReports(prev, prev);
    assert.equal(diff.changed, false);
    assert.equal(diff.addedEntities.length, 0);
    assert.equal(diff.removedFindings.length, 0);
  });
});
