import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defineCheck } from '../src/types/check.js';
import { runCheck } from '../src/runner.js';

const passive = defineCheck({
  id: 'test.passive',
  phase: 'recon',
  mode: 'passive',
  inputs: ['domain'],
  produces: ['dns_record'],
  source: 'test',
  needsKey: false,
  run: () => ({
    status: 'observation',
    observations: [{ kind: 'test.obs', data: { ok: true } }],
  }),
});

const active = defineCheck({
  id: 'test.active',
  phase: 'enumeration',
  mode: 'active',
  risk: 'medium',
  inputs: ['ip'],
  produces: ['port'],
  source: 'test',
  needsKey: false,
  run: () => ({ status: 'clean' }),
});

const domain = { type: 'domain', value: 'example.com' } as const;
const ip = { type: 'ip', value: '1.1.1.1' } as const;

describe('runCheck', () => {
  it('runs a passive check and passes through status + result', async () => {
    let t = 1000;
    const report = await runCheck(passive, domain, { now: () => (t += 500) });
    assert.equal(report.status, 'observation');
    assert.equal(report.result.observations.length, 1);
    assert.equal(report.durationMs, 500);
    assert.equal(report.error, undefined);
  });

  it('blocks an active check by default (passive-safe)', async () => {
    const report = await runCheck(active, ip);
    assert.equal(report.status, 'skipped');
    assert.match(report.skippedReason ?? '', /active check blocked/);
  });

  it('runs an active check only when explicitly allowed', async () => {
    const report = await runCheck(active, ip, { allowActive: true });
    assert.equal(report.status, 'clean');
  });

  it('skips when the target type is out of scope', async () => {
    const report = await runCheck(passive, ip);
    assert.equal(report.status, 'skipped');
    assert.match(report.skippedReason ?? '', /not in inputs/);
  });

  it('captures a thrown error instead of throwing', async () => {
    const boom = defineCheck({
      id: 'test.boom',
      phase: 'recon',
      mode: 'passive',
      inputs: ['domain'],
      produces: [],
      source: 'test',
      needsKey: false,
      run: () => {
        throw new Error('kaboom');
      },
    });
    const report = await runCheck(boom, domain);
    assert.equal(report.status, 'error');
    assert.equal(report.error, 'kaboom');
  });

  it('times out a slow check', async () => {
    const slow = defineCheck({
      id: 'test.slow',
      phase: 'recon',
      mode: 'passive',
      inputs: ['domain'],
      produces: [],
      source: 'test',
      needsKey: false,
      run: (_t, ctx) =>
        new Promise((resolve) => {
          const timer = setTimeout(() => resolve({ status: 'clean' }), 1000);
          ctx.signal?.addEventListener('abort', () => clearTimeout(timer));
        }),
    });
    const report = await runCheck(slow, domain, { config: { timeoutMs: 20 } });
    assert.equal(report.status, 'error');
    assert.match(report.error ?? '', /timed out/);
  });
});
