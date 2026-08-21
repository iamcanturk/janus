/**
 * Fetch a path on the target over http(s). Active — sends a live request.
 * Returns the first scheme that responds, or undefined if none do.
 */

import type { CheckContext, Target } from '@janus/core';

export interface PathResponse {
  readonly status: number;
  readonly text: string;
  readonly headers: Headers;
  readonly scheme: string;
}

export async function probePath(
  ctx: CheckContext,
  target: Target,
  path: string,
): Promise<PathResponse | undefined> {
  const schemes = target.type === 'ip' ? ['http', 'https'] : ['https', 'http'];
  for (const scheme of schemes) {
    try {
      const res = await ctx.fetch(`${scheme}://${target.value}${path}`, {
        redirect: 'manual',
        signal: ctx.signal,
      });
      return { status: res.status, text: await res.text(), headers: res.headers, scheme };
    } catch {
      // try next scheme
    }
  }
  return undefined;
}
