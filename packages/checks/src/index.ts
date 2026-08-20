/**
 * @janus/checks — all scanning modules, grouped by phase and mode.
 *
 * `allChecks` is the registry manifest. Adding a module means adding its file
 * and appending it here — the only edit outside the module's own file.
 */

import { CheckRegistry } from '@janus/core';
import type { CheckDefinition } from '@janus/core';

import { rdapCheck } from './scope/rdap.js';
import { crtshCheck } from './recon/crtsh.js';
import { dnsCheck } from './recon/dns.js';
import { waybackCheck } from './recon/wayback.js';
import { internetdbCheck } from './recon/internetdb.js';

/** Every check shipped with Janus. Append new modules here. */
export const allChecks: readonly CheckDefinition[] = [
  rdapCheck,
  crtshCheck,
  dnsCheck,
  waybackCheck,
  internetdbCheck,
];

/** Build a registry pre-loaded with every shipped check. */
export function createRegistry(): CheckRegistry {
  const registry = new CheckRegistry();
  registry.registerAll(allChecks);
  return registry;
}

export { rdapCheck, crtshCheck, dnsCheck, waybackCheck, internetdbCheck };
export { fetchJson, fetchText, HttpError, USER_AGENT } from './http.js';
export const CHECKS_PACKAGE = '@janus/checks';
