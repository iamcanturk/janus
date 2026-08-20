/**
 * Small HTTP helper shared by checks.
 *
 * Uses the fetch injected into the check context, so tests can stub it and no
 * real network call happens. Sends a stable Janus User-Agent and honors the
 * run's abort signal.
 */

import type { CheckContext } from '@janus/core';

export const USER_AGENT = 'janus-osint/0.0 (+https://github.com/iamcanturk/janus)';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'HttpError';
  }
}

function withDefaults(ctx: CheckContext, init?: RequestInit): RequestInit {
  return {
    ...init,
    signal: ctx.signal,
    headers: { 'User-Agent': USER_AGENT, ...init?.headers },
  };
}

/** GET + parse JSON. Throws {@link HttpError} on a non-2xx response. */
export async function fetchJson<T>(ctx: CheckContext, url: string, init?: RequestInit): Promise<T> {
  const res = await ctx.fetch(url, withDefaults(ctx, init));
  if (!res.ok) throw new HttpError(res.status, url);
  return (await res.json()) as T;
}

/** GET + return text. Throws {@link HttpError} on a non-2xx response. */
export async function fetchText(
  ctx: CheckContext,
  url: string,
  init?: RequestInit,
): Promise<string> {
  const res = await ctx.fetch(url, withDefaults(ctx, init));
  if (!res.ok) throw new HttpError(res.status, url);
  return res.text();
}
