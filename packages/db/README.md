# @janus/db

Durable persistence for scans — Prisma + PostgreSQL.

A **Job** is one scan of one target with one profile. Every check run is a
**Task**. The entity graph (**Entity** + **Edge**) and the observation/finding
split from `@janus/core` are persisted **per job**, so each scan keeps its own
graph.

## Commands

```bash
pnpm --filter @janus/db db:generate   # regenerate the Prisma client
pnpm --filter @janus/db db:validate   # validate the schema
pnpm --filter @janus/db db:migrate    # create/apply a dev migration (needs DB)
pnpm --filter @janus/db db:deploy      # apply committed migrations (prod)
```

The generated client lands in `generated/client` (gitignored). An initial
migration is committed under `prisma/migrations/0001_init`.

## Usage

```ts
import { db, createJob, persistScanReport, markJobDone } from '@janus/db';
import { runScan } from '@janus/core';
import { createRegistry } from '@janus/checks';

const job = await createJob(db, { target, profileId: 'pasif-recon', allowActive: false });
const report = await runScan(createRegistry(), 'pasif-recon', target);
await persistScanReport(db, job.id, report);
await markJobDone(db, job.id);
```

`persistScanReport` writes the whole report — graph, tasks, observations and
findings — in a single transaction.
