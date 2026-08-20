import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CheckDefinition } from '../src/types/check.js';
import { validateCheck } from '../src/validate.js';
import { CheckRegistry } from '../src/registry.js';

const good: CheckDefinition = {
  id: 'dns.records',
  phase: 'recon',
  mode: 'passive',
  inputs: ['domain'],
  produces: ['dns_record'],
  source: 'DoH',
  needsKey: false,
  run: () => ({ status: 'clean' }),
};

describe('validateCheck', () => {
  it('accepts a well-formed passive check', () => {
    assert.deepEqual(validateCheck(good), []);
  });

  it('rejects a non-namespaced id', () => {
    const issues = validateCheck({ ...good, id: 'nodot' });
    assert.ok(issues.some((i) => i.field === 'id'));
  });

  it('rejects an active check without a risk', () => {
    // Force the invalid shape the type system would normally forbid.
    const bad = { ...good, mode: 'active' } as unknown as CheckDefinition;
    const issues = validateCheck(bad);
    assert.ok(issues.some((i) => i.field === 'risk'));
  });

  it('rejects empty inputs', () => {
    const issues = validateCheck({ ...good, inputs: [] });
    assert.ok(issues.some((i) => i.field === 'inputs'));
  });
});

describe('CheckRegistry', () => {
  it('registers and looks up by phase', () => {
    const reg = new CheckRegistry();
    reg.register(good);
    assert.equal(reg.size, 1);
    assert.equal(reg.byPhase('recon').length, 1);
    assert.equal(reg.accepting('domain').length, 1);
  });

  it('throws on duplicate ids', () => {
    const reg = new CheckRegistry();
    reg.register(good);
    assert.throws(() => reg.register(good), /Duplicate check id/);
  });

  it('throws on invalid definitions', () => {
    const reg = new CheckRegistry();
    assert.throws(() => reg.register({ ...good, id: 'nodot' }), /Invalid check/);
  });
});
