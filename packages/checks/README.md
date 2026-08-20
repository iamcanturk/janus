# @janus/checks

All scanning modules, grouped by phase and mode. Each check is one file that
implements the `@janus/core` contract; adding a module means adding its file and
appending it to `allChecks` — nothing in the core changes.

## Shipped checks (Phase 3 — all passive, keyless)

| id                  | phase | input       | produces           | source            |
| ------------------- | ----- | ----------- | ------------------ | ----------------- |
| `rdap.registration` | scope | domain      | org                | RDAP (rdap.org)   |
| `subdomain.crtsh`   | recon | domain      | subdomain          | crt.sh (CT logs)  |
| `dns.records`       | recon | domain, sub | dns_record, ip     | DoH (Cloudflare)  |
| `wayback.urls`      | recon | domain      | url                | Wayback CDX       |
| `shodan.internetdb` | recon | ip          | port, service, cve | Shodan InternetDB |

`dns.records` raises **findings** for a missing SPF or DMARC policy;
`shodan.internetdb` raises a finding per known CVE. Everything else is an
observation — raw data never auto-promotes to a finding.

All modules are **passive**: they query third-party/open sources and send zero
packets to the target.

## Testing

Every check is unit-tested with an injected `fetch` stub (`test/helpers.ts`), so
tests never hit the network. `scan.integration.test.ts` runs a full `runScan`
with a mocked network and asserts the pivot
`domain → subdomain / ip → ports` plus the findings.

## Adding a module

1. Create a file under `src/<phase>/` and `defineCheck({ ... })`.
2. For an **active** module, `mode: 'active'` and `risk` are mandatory (enforced
   by the compiler) — respect the rate limit and never harm the target.
3. Append it to `allChecks` in `src/index.ts`.
4. Add a test with a mocked `fetch`.
