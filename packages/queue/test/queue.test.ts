import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createScanJobData, SCAN_QUEUE_NAME } from '../src/queue.js';

describe('createScanJobData', () => {
  it('derives allowActive from the profile', () => {
    const passive = createScanJobData('job1', { type: 'domain', value: 'x.com' }, 'pasif-recon');
    assert.equal(passive.allowActive, false);
    assert.equal(passive.profileId, 'pasif-recon');

    const active = createScanJobData(
      'job2',
      { type: 'domain', value: 'x.com' },
      'bug-bounty-surface',
    );
    assert.equal(active.allowActive, true);
  });

  it('rejects an unknown profile', () => {
    assert.throws(
      () => createScanJobData('job3', { type: 'domain', value: 'x.com' }, 'nope'),
      /Unknown profile/,
    );
  });

  it('exposes a stable queue name', () => {
    assert.equal(SCAN_QUEUE_NAME, 'janus:scan');
  });
});
