# @janus/tools

Keyless, **isomorphic** toolbox helpers — pure functions with no network access,
safe to run client-side (nothing is uploaded to a server). These are the
"el çantası": instant-value utilities that double as a traffic door.

| Tool          | Function(s)                                                   |
| ------------- | ------------------------------------------------------------- |
| Base64        | `toBase64` / `fromBase64` (unicode-safe)                      |
| Hex           | `toHex` / `fromHex`                                           |
| URL           | `urlEncode` / `urlDecode`                                     |
| Defang/refang | `defang` / `refang`                                           |
| Hash          | `hash` / `hashAll` (Web Crypto), `identifyHash`               |
| JWT           | `decodeJwt` (header/payload + `alg:none` warning; no verify)  |
| CIDR          | `parseCidr` (IPv4: network/broadcast/hosts)                   |
| IOC extractor | `extractIocs` (ips/domains/urls/emails/hashes; refangs first) |

Hashing uses Web Crypto (`crypto.subtle`), so MD5 is intentionally absent.
`decodeJwt` never verifies a signature — verification needs the key.

The web app exposes these at `/araclar`, running entirely in the browser.
