/**
 * rdap.registration — domain registration data via RDAP (the structured
 * successor to WHOIS). Passive: queries the RDAP bootstrap service. Belongs to
 * the scope phase — it helps answer "is this asset really the target's?".
 */

import { defineCheck } from '@janus/core';
import type { EntityInput, EdgeInput, Observation } from '@janus/core';
import { fetchJson, HttpError } from '../http.js';

interface VcardEntry {
  readonly 0: string;
}
interface RdapEntity {
  readonly roles?: readonly string[];
  readonly vcardArray?: readonly [string, readonly VcardEntry[]];
}
interface RdapNameserver {
  readonly ldhName?: string;
}
interface RdapEvent {
  readonly eventAction?: string;
  readonly eventDate?: string;
}
interface RdapResponse {
  readonly entities?: readonly RdapEntity[];
  readonly nameservers?: readonly RdapNameserver[];
  readonly events?: readonly RdapEvent[];
}

/** Pull the display name out of an RDAP vcardArray ("fn" property). */
export function vcardName(entity: RdapEntity): string | undefined {
  const props = entity.vcardArray?.[1] ?? [];
  for (const prop of props) {
    const arr = prop as unknown as unknown[];
    if (arr[0] === 'fn' && typeof arr[3] === 'string') return arr[3];
  }
  return undefined;
}

export const rdapCheck = defineCheck({
  id: 'rdap.registration',
  phase: 'scope',
  mode: 'passive',
  inputs: ['domain'],
  produces: ['org'],
  source: 'RDAP (rdap.org bootstrap)',
  needsKey: false,
  title: 'Alan adı tescili (RDAP)',
  description: 'RDAP ile tescil eden kuruluş, isim sunucuları ve önemli tarihler.',
  run: async (target, ctx) => {
    const url = `https://rdap.org/domain/${encodeURIComponent(target.value)}`;
    let data: RdapResponse;
    try {
      data = await fetchJson<RdapResponse>(ctx, url);
    } catch (err) {
      if (err instanceof HttpError) return { status: 'skipped' };
      throw err;
    }

    const entities: EntityInput[] = [];
    const edges: EdgeInput[] = [];
    const observations: Observation[] = [];

    const registrar = (data.entities ?? []).find((e) => e.roles?.includes('registrar'));
    const registrarName = registrar ? vcardName(registrar) : undefined;
    if (registrarName) {
      entities.push({ type: 'org', value: registrarName, meta: { role: 'registrar' } });
      edges.push({ from: target, to: { type: 'org', value: registrarName }, relation: 'owned_by' });
      observations.push({
        kind: 'rdap.registrar',
        entity: target,
        data: { registrar: registrarName },
      });
    }

    const nameservers = (data.nameservers ?? [])
      .map((n) => n.ldhName?.toLowerCase())
      .filter((n): n is string => Boolean(n));
    if (nameservers.length > 0) {
      observations.push({ kind: 'rdap.nameservers', entity: target, data: { nameservers } });
    }

    if (data.events && data.events.length > 0) {
      observations.push({
        kind: 'rdap.events',
        entity: target,
        data: { events: data.events.map((e) => ({ action: e.eventAction, date: e.eventDate })) },
      });
    }

    if (observations.length === 0) return { status: 'clean' };
    return { status: 'observation', entities, edges, observations };
  },
});
