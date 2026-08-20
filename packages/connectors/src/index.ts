/**
 * @janus/connectors — BYOK integrations. Each client takes the check context
 * (for the injected fetch + abort) and a key resolved via ctx.getKey(). Keys
 * are stored encrypted (see crypto.ts) and never logged.
 */

export { encryptSecret, decryptSecret } from './crypto.js';
export { vtDomainReport } from './virustotal.js';
export type { VtDomainReport } from './virustotal.js';
export { shodanHost } from './shodan.js';
export type { ShodanHost } from './shodan.js';

export const CONNECTORS_PACKAGE = '@janus/connectors';
