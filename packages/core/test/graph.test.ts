import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityGraph, entityId, normalizeValue } from '../src/graph.js';

describe('entity id derivation', () => {
  it('lowercases case-insensitive types', () => {
    assert.equal(entityId({ type: 'domain', value: 'Example.COM' }), 'domain:example.com');
    assert.equal(normalizeValue('domain', '  Example.COM '), 'example.com');
  });

  it('preserves case for case-sensitive types', () => {
    assert.equal(entityId({ type: 'leaked_secret', value: 'AbC123' }), 'leaked_secret:AbC123');
  });
});

describe('EntityGraph merge', () => {
  const clock = () => {
    let n = 0;
    return () => `2026-01-01T00:00:0${n++}.000Z`;
  };

  it('deduplicates entities by natural key and merges meta', () => {
    const g = new EntityGraph(clock());
    g.addEntity({ type: 'domain', value: 'example.com', meta: { a: 1 } }, 'c1');
    g.addEntity({ type: 'domain', value: 'EXAMPLE.com', meta: { b: 2 } }, 'c2');

    assert.equal(g.size.entities, 1);
    const e = g.getEntity({ type: 'domain', value: 'example.com' });
    assert.deepEqual(e?.meta, { a: 1, b: 2 });
    assert.equal(e?.sourceCheck, 'c1'); // first writer wins
    assert.equal(e?.firstSeen, '2026-01-01T00:00:00.000Z');
    assert.equal(e?.lastSeen, '2026-01-01T00:00:01.000Z');
  });

  it('upserts edge endpoints and dedups edges', () => {
    const g = new EntityGraph(clock());
    g.addEdge(
      {
        from: { type: 'domain', value: 'a.com' },
        to: { type: 'ip', value: '1.1.1.1' },
        relation: 'resolves_to',
      },
      'c1',
    );
    g.addEdge(
      {
        from: { type: 'domain', value: 'a.com' },
        to: { type: 'ip', value: '1.1.1.1' },
        relation: 'resolves_to',
      },
      'c2',
    );

    assert.equal(g.size.entities, 2);
    assert.equal(g.size.edges, 1);
  });
});
