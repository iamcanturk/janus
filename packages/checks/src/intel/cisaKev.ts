/**
 * intel.cisa_kev — PASSIVE. Enriches `cve` entities (e.g. from InternetDB) by
 * matching them against the CISA Known Exploited Vulnerabilities catalog. A
 * match means the CVE is actively exploited in the wild -> critical finding.
 *
 * The catalog is fetched once and cached in-process. Tests inject the set via
 * `config.options.kevIds` and never touch the network.
 */

import { defineCheck } from '@janus/core';
import type { CheckContext } from '@janus/core';
import { fetchJson } from '../http.js';

const KEV_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface KevEntry {
  readonly cveID: string;
  readonly vulnerabilityName?: string;
  readonly dateAdded?: string;
}
interface KevCatalog {
  readonly vulnerabilities?: readonly KevEntry[];
}

interface Cache {
  readonly at: number;
  readonly ids: ReadonlySet<string>;
}
let cache: Cache | null = null;

/** For tests: clear the in-process KEV cache. */
export function resetKevCache(): void {
  cache = null;
}

async function loadKev(ctx: CheckContext): Promise<ReadonlySet<string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.ids;
  const catalog = await fetchJson<KevCatalog>(ctx, KEV_URL);
  const ids = new Set((catalog.vulnerabilities ?? []).map((v) => v.cveID.toUpperCase()));
  cache = { at: Date.now(), ids };
  return ids;
}

export const cisaKevCheck = defineCheck({
  id: 'intel.cisa_kev',
  phase: 'intel',
  mode: 'passive',
  inputs: ['cve'],
  produces: [],
  source: 'CISA Known Exploited Vulnerabilities catalog',
  needsKey: false,
  title: 'CISA KEV eşleştirme',
  description: 'CVE’leri aktif olarak sömürülen zafiyetler kataloğuyla karşılaştırır.',
  run: async (target, ctx, config) => {
    const cve = target.value.toUpperCase();
    const override = config.options?.kevIds as string[] | undefined;
    const ids = override ? new Set(override.map((s) => s.toUpperCase())) : await loadKev(ctx);

    if (!ids.has(cve)) return { status: 'clean' };

    return {
      status: 'finding',
      findings: [
        {
          code: 'intel.cisa_kev',
          title: `Aktif sömürülen zafiyet (CISA KEV): ${target.value}`,
          severity: 'critical',
          entity: target,
          description:
            'Bu CVE, CISA Known Exploited Vulnerabilities kataloğunda yer alıyor — vahşi doğada aktif olarak sömürülüyor. Acil önceliklendir.',
          references: [
            {
              title: 'CISA KEV Catalog',
              url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
            },
          ],
        },
      ],
    };
  },
});
