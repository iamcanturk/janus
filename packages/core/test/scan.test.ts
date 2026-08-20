import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defineCheck } from '../src/types/check.js';
import { CheckRegistry } from '../src/registry.js';
import { runScan, selectChecks } from '../src/scan.js';
import { resolveProfile } from '../src/profile.js';
import type { Profile } from '../src/profile.js';

const subfinder = defineCheck({
  id: 'subdomain.enum',
  phase: 'recon',
  mode: 'passive',
  inputs: ['domain'],
  produces: ['subdomain'],
  source: 'crt.sh (fake)',
  needsKey: false,
  run: (target) => ({
    status: 'observation',
    entities: [{ type: 'subdomain', value: `www.${target.value}` }],
    edges: [
      {
        from: { type: 'subdomain', value: `www.${target.value}` },
        to: target,
        relation: 'subdomain_of',
      },
    ],
    observations: [{ kind: 'subdomain.found', data: { host: `www.${target.value}` } }],
  }),
});

const resolver = defineCheck({
  id: 'dns.resolve',
  phase: 'recon',
  mode: 'passive',
  inputs: ['subdomain'],
  produces: ['ip'],
  source: 'DoH (fake)',
  needsKey: false,
  run: (target) => ({
    status: 'observation',
    entities: [{ type: 'ip', value: '203.0.113.10' }],
    edges: [{ from: target, to: { type: 'ip', value: '203.0.113.10' }, relation: 'resolves_to' }],
  }),
});

const portscan = defineCheck({
  id: 'net.portscan',
  phase: 'recon',
  mode: 'active',
  risk: 'medium',
  inputs: ['ip'],
  produces: ['port'],
  source: 'tcp connect (fake)',
  needsKey: false,
  run: (target) => ({
    status: 'finding',
    findings: [
      {
        code: 'net.open_port',
        title: 'Open port',
        severity: 'low',
        entity: target,
        description: 'port 22 open',
      },
    ],
  }),
});

const passiveProfile: Profile = {
  id: 'test-passive',
  title: 't',
  description: 't',
  phases: ['recon'],
  allowActive: false,
};

const activeProfile: Profile = { ...passiveProfile, id: 'test-active', allowActive: true };

describe('selectChecks', () => {
  it('excludes active checks under a passive profile, includes them when allowed', () => {
    const reg = new CheckRegistry();
    reg.registerAll([subfinder, resolver, portscan]);
    assert.deepEqual(
      selectChecks(reg, passiveProfile)
        .map((c) => c.id)
        .sort(),
      ['dns.resolve', 'subdomain.enum'],
    );
    assert.equal(selectChecks(reg, activeProfile).length, 3);
  });
});

describe('runScan pivot loop', () => {
  it('pivots domain -> subdomain -> ip across rounds (passive)', async () => {
    const reg = new CheckRegistry();
    reg.registerAll([subfinder, resolver, portscan]);

    const report = await runScan(reg, passiveProfile, { type: 'domain', value: 'example.com' });

    const types = report.entities.map((e) => e.type).sort();
    assert.deepEqual(types, ['domain', 'ip', 'subdomain']);
    assert.equal(report.edges.length, 2);

    const ranIds = report.tasks.map((t) => t.checkId).sort();
    assert.deepEqual(ranIds, ['dns.resolve', 'subdomain.enum']);
    assert.equal(report.counts.observations, 1);
    // Active portscan is not selected under a passive profile.
    assert.equal(report.findings.length, 0);
  });

  it('runs the active check and produces a finding under an active profile', async () => {
    const reg = new CheckRegistry();
    reg.registerAll([subfinder, resolver, portscan]);

    const report = await runScan(reg, activeProfile, { type: 'domain', value: 'example.com' });
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0]?.code, 'net.open_port');
    assert.ok(report.tasks.some((t) => t.checkId === 'net.portscan' && t.status === 'finding'));
  });
});

describe('resolveProfile', () => {
  it('resolves built-in ids and rejects unknown ones', () => {
    assert.equal(resolveProfile('pasif-recon').allowActive, false);
    assert.equal(resolveProfile('bug-bounty-surface').allowActive, true);
    assert.throws(() => resolveProfile('nope'), /Unknown profile/);
  });
});
