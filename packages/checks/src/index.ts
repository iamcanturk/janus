/**
 * @janus/checks — all scanning modules, grouped by phase and mode.
 *
 * `allChecks` is the registry manifest. Passive checks (crt.sh, RDAP/ASN, DNS,
 * Wayback, InternetDB) land in Phase 3 and get appended here — that is the only
 * edit adding a module requires outside its own file.
 */

import { CheckRegistry } from '@janus/core';
import type { CheckDefinition } from '@janus/core';

/** Every check shipped with Janus. Append new modules here. */
export const allChecks: readonly CheckDefinition[] = [];

/** Build a registry pre-loaded with every shipped check. */
export function createRegistry(): CheckRegistry {
  const registry = new CheckRegistry();
  registry.registerAll(allChecks);
  return registry;
}

export const CHECKS_PACKAGE = '@janus/checks';
