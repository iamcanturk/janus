# @janus/core

The stable core of Janus: the check contract, the entity graph and the runner.
Everything else builds on this. **Modules grow by adding files under
`@janus/checks` — not by editing this package.**

## The check contract

A check is one unit of work — an independent plugin that declares what it
consumes/produces and implements `run()`:

```ts
import { defineCheck } from '@janus/core';

export const check = defineCheck({
  id: 'dns.records', // unique, dot-namespaced
  phase: 'recon', // scope | recon | enumeration | surface | exposure | intel | evidence
  mode: 'passive', // passive = zero packets to target | active = live requests
  inputs: ['domain'], // entity types consumed
  produces: ['dns_record'], // entity/edge types written to the graph
  source: 'DoH resolver', // human-readable data source
  needsKey: false, // BYOK key required?
  run: async (target, context, config) => ({
    status: 'observation',
    observations: [{ kind: 'dns.a', entity: target, data: { ip: '1.1.1.1' } }],
  }),
});
```

An **active** check additionally _must_ declare a `risk` (`low | medium | high`).
This is enforced at compile time — an active check without a risk does not type-check.

## Passive vs active — the safety gate

`runCheck()` refuses to run an active check unless `allowActive: true` is passed
explicitly. This is the code-level guarantee behind _"an active module never runs
in a passive profile"_. The default is `false`.

```ts
import { runCheck } from '@janus/core';

await runCheck(activeCheck, target); // → skipped (blocked)
await runCheck(activeCheck, target, { allowActive: true }); // → runs
```

## Observations vs findings

- **Observation** — raw data, no judgement (a DNS record, an open port).
- **Finding** — an interpretation that carries a `severity`.

An observation never auto-promotes to a finding; a check authors findings on
purpose. Keep the split in every layer.

## Entity graph

All output flows into a shared graph. `EntityGraph` derives stable ids
(`type:normalized-value`), de-duplicates by natural key, merges metadata and
tracks `firstSeen`/`lastSeen`. Persistence (Phase 2) reuses the same id
derivation so the DB and in-memory views agree.

## Exports

`defineCheck`, `runCheck`, `CheckRegistry`, `EntityGraph`, `entityId`,
`validateCheck`, `nullLogger`/`createConsoleLogger`, plus all contract types.
