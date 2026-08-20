/**
 * VirusTotal v3 connector (BYOK). Free tier: ~4 req/min, 500/day — respect it.
 * Docs: https://docs.virustotal.com/reference/domain-info
 */

import type { CheckContext } from '@janus/core';

export interface VtDomainReport {
  readonly malicious: number;
  readonly suspicious: number;
  readonly harmless: number;
  readonly reputation: number;
}

interface VtResponse {
  readonly data?: {
    readonly attributes?: {
      readonly last_analysis_stats?: Record<string, number>;
      readonly reputation?: number;
    };
  };
}

/** Domain reputation report, or undefined on a non-2xx (bad key / not found). */
export async function vtDomainReport(
  ctx: CheckContext,
  key: string,
  domain: string,
): Promise<VtDomainReport | undefined> {
  const res = await ctx.fetch(
    `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(domain)}`,
    {
      headers: { 'x-apikey': key },
      signal: ctx.signal,
    },
  );
  if (!res.ok) return undefined;
  const body = (await res.json()) as VtResponse;
  const stats = body.data?.attributes?.last_analysis_stats ?? {};
  return {
    malicious: stats.malicious ?? 0,
    suspicious: stats.suspicious ?? 0,
    harmless: stats.harmless ?? 0,
    reputation: body.data?.attributes?.reputation ?? 0,
  };
}
