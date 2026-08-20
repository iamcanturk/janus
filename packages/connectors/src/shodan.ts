/**
 * Shodan host connector (BYOK — full API, unlike the keyless InternetDB).
 * Docs: https://developer.shodan.io/api
 */

import type { CheckContext } from '@janus/core';

export interface ShodanHost {
  readonly ports: number[];
  readonly vulns: string[];
  readonly hostnames: string[];
  readonly org?: string;
}

interface ShodanResponse {
  readonly ports?: number[];
  readonly vulns?: string[] | Record<string, unknown>;
  readonly hostnames?: string[];
  readonly org?: string;
}

/** Full host lookup, or undefined on a non-2xx (bad key / no data). */
export async function shodanHost(
  ctx: CheckContext,
  key: string,
  ip: string,
): Promise<ShodanHost | undefined> {
  const res = await ctx.fetch(
    `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(key)}`,
    { signal: ctx.signal },
  );
  if (!res.ok) return undefined;
  const body = (await res.json()) as ShodanResponse;
  const vulns = Array.isArray(body.vulns) ? body.vulns : Object.keys(body.vulns ?? {});
  return {
    ports: body.ports ?? [],
    vulns,
    hostnames: body.hostnames ?? [],
    org: body.org,
  };
}
