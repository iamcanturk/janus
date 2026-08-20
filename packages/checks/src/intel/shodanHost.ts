/**
 * intel.shodan_host — PASSIVE, BYOK. Full Shodan host lookup (richer than the
 * keyless InternetDB): ports, org and known vulns. Skipped when no
 * SHODAN_API_KEY is set. Reads Shodan's cached view; never touches the target.
 */

import { defineCheck } from '@janus/core';
import type { EntityInput, EdgeInput, Observation, Finding } from '@janus/core';
import { shodanHost } from '@janus/connectors';

export const shodanHostCheck = defineCheck({
  id: 'intel.shodan_host',
  phase: 'recon',
  mode: 'passive',
  inputs: ['ip'],
  produces: ['port', 'org', 'cve'],
  source: 'Shodan host API (BYOK)',
  needsKey: true,
  title: 'Shodan host (BYOK)',
  description: 'Shodan tam host kaydı: portlar, kuruluş ve bilinen zafiyetler.',
  run: async (target, ctx) => {
    const key = ctx.getKey('SHODAN_API_KEY');
    if (!key) return { status: 'skipped' };

    const host = await shodanHost(ctx, key, target.value);
    if (!host) return { status: 'skipped' };

    const entities: EntityInput[] = [];
    const edges: EdgeInput[] = [];
    const observations: Observation[] = [];
    const findings: Finding[] = [];

    for (const port of host.ports) {
      const value = `${target.value}:${port}`;
      entities.push({ type: 'port', value, meta: { port } });
      edges.push({ from: target, to: { type: 'port', value }, relation: 'exposes' });
    }
    if (host.org) {
      entities.push({ type: 'org', value: host.org });
      edges.push({ from: target, to: { type: 'org', value: host.org }, relation: 'owned_by' });
    }
    observations.push({
      kind: 'shodan.host',
      entity: target,
      data: { ports: host.ports, org: host.org, hostnames: host.hostnames },
    });

    for (const cve of host.vulns) {
      entities.push({ type: 'cve', value: cve });
      edges.push({ from: target, to: { type: 'cve', value: cve }, relation: 'affected_by' });
      findings.push({
        code: 'intel.shodan_vuln',
        title: `Shodan bilinen zafiyet: ${cve}`,
        severity: 'high',
        entity: target,
        description: `Shodan bu host için ${cve} zafiyetini raporluyor. Doğrulama gerekir.`,
        references: [{ title: cve, url: `https://nvd.nist.gov/vuln/detail/${cve}` }],
      });
    }

    return {
      status: findings.length > 0 ? 'finding' : 'observation',
      entities,
      edges,
      observations,
      findings,
    };
  },
});
