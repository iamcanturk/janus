<div align="center">

# Janus

**Web-based, self-hostable, BYOK modular OSINT & vulnerability scanning platform.**

_"A cybersecurity researcher's toolbox."_

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Status: WIP](https://img.shields.io/badge/status-work%20in%20progress-orange.svg)](#roadmap)

</div>

---

Janus is named after the two-faced Roman god: one face looks outward/backward
(**passive** observation), the other looks forward/at the target (**active**
recon). This duality is the core of the whole architecture.

> ⚠️ **Legal notice:** Use Janus only against assets you own or are explicitly
> authorized to test. Active modules send live traffic to the target and are
> always opt-in behind an explicit confirmation. You are responsible for
> unauthorized scanning. See [`PROJECT.md`](./PROJECT.md) for the full ruleset.

## What it does

Everything a researcher needs while mapping the attack surface of a target
(domain / IP / organization) and scanning for vulnerabilities — collected in a
single web UI as a live checklist. Every control is a **module** (`check`); the
system grows by adding modules, not by touching the core.

- **Passive / active split** — a passive check sends _zero_ packets to the
  target; an active check sends live requests behind a red opt-in gate.
- **Entity graph** — all output is written to a shared graph
  (`domain → subdomain → ip → asn → org → ...`) you can pivot through.
- **Job & queue** — scans run as background jobs; results stream into the UI.
- **BYOK** — bring your own keys for premium sources; keyless sources work out
  of the box.

See [`PROJECT.md`](./PROJECT.md) for the full design, contracts and rules.

## Tech stack

pnpm workspace + Turborepo · Next.js 15 (web) · Node worker · BullMQ + Redis ·
PostgreSQL + Prisma · Docker Compose.

UI copy is Turkish; code, identifiers and commit messages are English.

## Repository layout

```
janus/
├── apps/
│   ├── web/          # Next.js UI
│   └── worker/       # queue consumer
├── packages/
│   ├── core/         # check runner, entity graph, job model
│   ├── checks/       # all modules (grouped by phase/mode)
│   ├── tools/        # keyless toolbox (hash, jwt, cidr...)
│   └── connectors/   # BYOK integrations (shodan, vt, otx, censys...)
├── docker-compose.yml
└── .env.example      # BYOK key template
```

## Getting started

> Scaffolding is landing phase by phase — see the roadmap below.

```bash
pnpm install
cp .env.example .env
docker compose up -d   # postgres + redis
pnpm dev
```

### Try a passive scan now (no infra needed)

The passive modules run end to end without Postgres or Redis:

```bash
pnpm --filter @janus/worker scan example.com
```

This queries only third-party/open sources (crt.sh, RDAP, DoH, Wayback, Shodan
InternetDB) and sends **zero packets to the target**. Only scan assets you own
or are authorized to test.

## Roadmap

Development lands one phase at a time (each phase = a GitHub issue + PR):

- [x] **Phase 0** — Bootstrap: monorepo, tooling, Docker Compose
- [x] **Phase 1** — Core contract: check schema, entity graph, runner
- [x] **Phase 2** — Persistence + queue: Prisma schema, BullMQ, worker, profiles
- [x] **Phase 3** — Passive checks: crt.sh, RDAP/ASN, DNS, Wayback, InternetDB
- [x] **Phase 4** — Web UI: target input, profile select, live checklist
- [x] **Phase 5** — Active checks + safety gate: live host/port, opt-in
- [ ] **Phase 6** — Exposure + intel: security headers/TLS, CISA KEV
- [ ] **Phase 7** — Toolbox: hash, JWT, Base64, CIDR, IOC extractor
- [ ] **Phase 8** — Evidence & report: SHA-256 + timestamp, Markdown/PDF

## License

[MIT](./LICENSE) © Yusuf Can Türk
