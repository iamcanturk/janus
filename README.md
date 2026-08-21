<div align="center">

# 🜏 Janus

**A cybersecurity researcher's toolbox — in one self-hostable web app.**

Web-based · self-hosted · BYOK · modular OSINT & vulnerability scanning.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![Self-hosted](https://img.shields.io/badge/deploy-self--hosted-06b6d4.svg)
![No account](https://img.shields.io/badge/accounts-none-22c55e.svg)

</div>

---

Janus is named after the two-faced Roman god: one face looks outward (**passive**
observation), the other looks at the target (**active** recon). That duality is
the core of the whole design — and the safety model.

You give Janus a **target** (a domain or an IP — it auto-detects which), pick how
deep to go, and it maps the attack surface into a live **entity graph** you can
pivot through, turning observations into findings and a signed report.

> ⚠️ **Use only against assets you own or are explicitly authorized to test.**
> Passive modules send _zero_ packets to the target; active modules send live
> traffic and sit behind an explicit confirmation. You are responsible for
> unauthorized scanning. Personal data is subject to KVKK/GDPR.

## Why Janus

- **Passive by default, active on purpose.** A passive check never touches the
  target — it only reads third-party/open sources (CT logs, RDAP, DoH, Wayback,
  Shodan InternetDB, CISA KEV…). Active checks (live host probe, port scan,
  `.git`/`.env` exposure…) are refused unless you opt in — three independent
  gates: the runner, a compile-time `risk` requirement, and a red UI confirm.
- **One target, staged scanning.** Run a single check, a whole phase, or a
  profile. Results accumulate and each run _pivots off_ what earlier runs found
  (`domain → subdomain → ip → ports → CVEs → …`).
- **An entity graph you can pivot.** Every result flows into a shared graph;
  click a node to continue from it.
- **Observations ≠ findings.** Raw data never silently becomes a finding — the
  split is kept in the UI, the graph and the report.
- **Bring your own keys.** Keyless sources work out of the box; premium
  connectors (VirusTotal, Shodan) light up when you add a key and are skipped
  otherwise. Keys are stored encrypted (AES-256-GCM) and never logged.
- **Self-hosted, no accounts.** Everyone runs their own instance. No multi-user
  auth, no data leaving your box.
- **Reports & monitoring.** Tamper-evident Markdown (SHA-256) + printable PDF;
  scheduled re-scans that diff against the previous run and notify on change.
- **A keyless toolbox.** Base64/Hex/URL, hashing, JWT decode, CIDR calculator and
  an IOC extractor — all running entirely in your browser.
- **Light & dark**, follows your system.

## Modules

Passive (keyless unless marked BYOK) — **zero packets to the target**:

| id                               | phase | produces           | source            |
| -------------------------------- | ----- | ------------------ | ----------------- |
| `net.asn`                        | scope | asn                | RIPEstat          |
| `rdap.registration`              | scope | org                | RDAP              |
| `subdomain.crtname`              | recon | subdomain          | crt.name (CT)     |
| `dns.records`                    | recon | dns_record, ip     | DoH — +SPF/DMARC  |
| `dns.caa`                        | recon | —                  | DoH               |
| `net.reverse_dns`                | recon | domain             | DoH (PTR)         |
| `wayback.urls`                   | recon | url                | Wayback CDX       |
| `shodan.internetdb`              | recon | port, service, cve | Shodan InternetDB |
| `intel.cisa_kev`                 | intel | —                  | CISA KEV catalog  |
| `intel.virustotal_domain` · BYOK | intel | —                  | VirusTotal        |
| `intel.shodan_host` · BYOK       | recon | port, org, cve     | Shodan            |

Active — **sends live packets; only under a profile with `allowActive`**:

| id                      | phase       | risk   | produces            |
| ----------------------- | ----------- | ------ | ------------------- |
| `host.http_probe`       | enumeration | low    | service, technology |
| `net.port_scan`         | enumeration | medium | port, service       |
| `http.robots`           | enumeration | low    | url                 |
| `http.security_headers` | exposure    | low    | —                   |
| `tls.health`            | exposure    | low    | certificate         |
| `http.git_exposure`     | exposure    | medium | —                   |
| `http.env_exposure`     | exposure    | high   | —                   |
| `http.security_txt`     | exposure    | low    | —                   |

Adding a module means adding one file and appending it to a list — the core
never changes. See [`packages/checks`](./packages/checks).

## Profiles

- **Pasif Keşif** — passive phases only; sends nothing to the target.
- **Bug Bounty Yüzeyi** — passive + active enumeration/surface (authorized-use
  assumption); the only profile that runs active checks.
- **Kendi Varlığım (İzleme)** — periodic passive monitoring that diffs runs.

## Quick start

```bash
pnpm install
pnpm --filter @janus/core --filter @janus/checks build
pnpm --filter @janus/web dev        # → http://localhost:3000
```

Try a passive scan from the CLI without any web server or database:

```bash
pnpm --filter @janus/worker scan example.com --report report.md
```

Saved scan history is optional — it uses PostgreSQL. Bring it up (plus Redis for
the job queue) with Docker; the app degrades gracefully without it:

```bash
cp .env.example .env
docker compose up -d
pnpm --filter @janus/db db:deploy
```

## Tech stack

pnpm workspace + Turborepo · Next.js 15 (App Router) + Tailwind v4 · React Flow ·
Node worker · BullMQ + Redis · PostgreSQL + Prisma · Docker Compose. TypeScript
throughout, ~100 tests. UI copy is Turkish; code and commits are English.

See [`PROJECT.md`](./PROJECT.md) for the full design, contracts and rules.

## Author

**Yusuf Can Türk** — Application Security Engineer

[🌐 iamcanturk.dev](https://iamcanturk.dev) ·
[𝕏 @iamcanturk](https://x.com/iamcanturk) ·
[in LinkedIn](https://www.linkedin.com/in/yusufcanturk/) ·
[GitHub](https://github.com/iamcanturk) ·
[Instagram](https://www.instagram.com/iamcanturk/)

## License

[MIT](./LICENSE) © Yusuf Can Türk
