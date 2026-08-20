# @janus/connectors

BYOK (bring-your-own-key) integrations for premium sources, plus the crypto
building block for storing keys encrypted at rest.

## Clients

| function                    | source          | key                  |
| --------------------------- | --------------- | -------------------- |
| `vtDomainReport(ctx,k,dom)` | VirusTotal v3   | `VIRUSTOTAL_API_KEY` |
| `shodanHost(ctx,k,ip)`      | Shodan host API | `SHODAN_API_KEY`     |

Each client takes the check context (for the injected `fetch` + abort signal)
and a key, and returns `undefined` on a non-2xx (bad key / no data) so the
calling check can report `skipped`. Free-tier limits change often — verify the
current quota before relying on one (VirusTotal free ≈ 4 req/min, 500/day).

The checks that use them (`intel.virustotal_domain`, `intel.shodan_host`) declare
`needsKey: true` and are **skipped when no key is set**, so a first-run scan
never breaks.

## Encrypted key storage

```ts
import { encryptSecret, decryptSecret } from '@janus/connectors';

const token = encryptSecret(apiKey, process.env.ENCRYPTION_KEY);
// store `token`; it is AES-256-GCM and authenticated (tampering fails to decrypt)
const apiKey = decryptSecret(token, process.env.ENCRYPTION_KEY);
```

Keys are never logged and never sent anywhere but their own provider.
