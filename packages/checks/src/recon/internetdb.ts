/**
 * shodan.internetdb — Shodan's free, keyless InternetDB. Passive: Shodan scans
 * the internet; we only read its cached view of an IP, we never touch the host.
 * Surfaces open ports, service CPEs and known CVEs (as findings).
 */

import { defineCheck } from '@janus/core';
import type { EntityInput, EdgeInput, Observation, Finding } from '@janus/core';
import { fetchJson, HttpError } from '../http.js';

interface InternetDbResponse {
  readonly ip: string;
  readonly ports?: readonly number[];
  readonly cpes?: readonly string[];
  readonly hostnames?: readonly string[];
  readonly tags?: readonly string[];
  readonly vulns?: readonly string[];
}

export const internetdbCheck = defineCheck({
  id: 'shodan.internetdb',
  phase: 'recon',
  mode: 'passive',
  inputs: ['ip'],
  produces: ['port', 'service', 'cve'],
  source: 'Shodan InternetDB (keyless)',
  needsKey: false,
  title: 'Bilinen portlar & CVE (InternetDB)',
  description: 'Shodan InternetDB önbelleğinden pasif port, servis ve zafiyet eşleştirme.',
  run: async (target, ctx) => {
    const url = `https://internetdb.shodan.io/${encodeURIComponent(target.value)}`;
    let data: InternetDbResponse;
    try {
      data = await fetchJson<InternetDbResponse>(ctx, url);
    } catch (err) {
      if (err instanceof HttpError) return { status: err.status === 404 ? 'clean' : 'skipped' };
      throw err;
    }

    const entities: EntityInput[] = [];
    const edges: EdgeInput[] = [];
    const observations: Observation[] = [];
    const findings: Finding[] = [];

    const ports = data.ports ?? [];
    for (const port of ports) {
      const value = `${target.value}:${port}`;
      entities.push({ type: 'port', value, meta: { port } });
      edges.push({ from: target, to: { type: 'port', value }, relation: 'exposes' });
    }
    if (ports.length > 0) {
      observations.push({
        kind: 'internetdb.ports',
        entity: target,
        data: { ports },
        message: `${ports.length} açık port`,
      });
    }
    if (data.cpes && data.cpes.length > 0) {
      observations.push({ kind: 'internetdb.cpes', entity: target, data: { cpes: data.cpes } });
    }
    if (data.hostnames && data.hostnames.length > 0) {
      observations.push({
        kind: 'internetdb.hostnames',
        entity: target,
        data: { hostnames: data.hostnames },
      });
    }

    for (const cve of data.vulns ?? []) {
      entities.push({ type: 'cve', value: cve });
      edges.push({ from: target, to: { type: 'cve', value: cve }, relation: 'affected_by' });
      findings.push({
        code: 'intel.known_vuln',
        title: `Bilinen zafiyet: ${cve}`,
        severity: 'high',
        entity: target,
        description: `Shodan InternetDB bu IP için ${cve} zafiyetini raporluyor. Doğrulama gerekir.`,
        references: [{ title: cve, url: `https://nvd.nist.gov/vuln/detail/${cve}` }],
      });
    }

    if (findings.length > 0) return { status: 'finding', entities, edges, observations, findings };
    if (observations.length > 0) return { status: 'observation', entities, edges, observations };
    return { status: 'clean' };
  },
});
