# @janus/checks

All scanning modules, grouped by phase and mode. Each check is one file that
implements the `@janus/core` contract; adding a module means adding its file and
appending it to `allChecks` — nothing in the core changes.

## Shipped checks

### Passive (keyless) — sends zero packets to the target

| id                  | phase | input       | produces           | source            |
| ------------------- | ----- | ----------- | ------------------ | ----------------- |
| `rdap.registration` | scope | domain      | org                | RDAP (rdap.org)   |
| `subdomain.crtsh`   | recon | domain      | subdomain          | crt.sh (CT logs)  |
| `dns.records`       | recon | domain, sub | dns_record, ip     | DoH (Cloudflare)  |
| `wayback.urls`      | recon | domain      | url                | Wayback CDX       |
| `shodan.internetdb` | recon | ip          | port, service, cve | Shodan InternetDB |
| `intel.cisa_kev`    | intel | cve         | —                  | CISA KEV catalog  |

### Active — sends live packets; only under a profile with `allowActive`

| id                      | phase       | risk   | input           | produces            |
| ----------------------- | ----------- | ------ | --------------- | ------------------- |
| `host.http_probe`       | enumeration | low    | domain, sub, ip | service, technology |
| `net.port_scan`         | enumeration | medium | ip              | port, service       |
| `http.security_headers` | exposure    | low    | domain, sub, ip | —                   |
| `tls.health`            | exposure    | low    | domain, sub     | certificate         |

`dns.records` raises **findings** for a missing SPF or DMARC policy;
`shodan.internetdb` raises a finding per known CVE; `intel.cisa_kev` elevates a
CVE that is actively exploited (CISA KEV) to a **critical** finding;
`http.security_headers` and `tls.health` flag missing hardening headers and
expired/self-signed certificates. Everything else is an observation — raw data
never auto-promotes to a finding.

Active checks are refused by the runner unless the profile sets `allowActive`
(only `bug-bounty-surface` does), and the web UI gates them behind an explicit
red confirmation. `net.port_scan` is a TCP-connect scan (rate-limited, no
payload) with an injectable connect primitive, so the test suite opens no real
sockets.

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
