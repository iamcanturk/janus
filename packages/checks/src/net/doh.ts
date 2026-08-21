/**
 * Shared DNS-over-HTTPS query helper (Cloudflare). Passive — the query goes to
 * a public resolver, never to the target.
 */

import type { CheckContext } from '@janus/core';
import { fetchJson } from '../http.js';

const DOH_URL = 'https://cloudflare-dns.com/dns-query';

export interface DohAnswer {
  readonly name: string;
  readonly type: number;
  readonly data: string;
}
interface DohResponse {
  readonly Status: number;
  readonly Answer?: readonly DohAnswer[];
}

export async function dohQuery(
  ctx: CheckContext,
  name: string,
  type: string,
): Promise<DohAnswer[]> {
  const url = `${DOH_URL}?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetchJson<DohResponse>(ctx, url, {
    headers: { Accept: 'application/dns-json' },
  });
  return [...(res.Answer ?? [])];
}

/** Strip surrounding quotes DoH puts around TXT/CAA records. */
export function unquote(txt: string): string {
  return txt.replace(/^"|"$/g, '').replace(/""/g, '');
}
