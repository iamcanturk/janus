import { nullLogger } from '@janus/core';
import type { CheckContext } from '@janus/core';

/** Build a JSON Response like the real fetch would return. */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function errorResponse(status: number): Response {
  return new Response('', { status });
}

export type Route = (url: string) => Response | undefined;

/**
 * A check context whose fetch is driven by routes. Each route inspects the URL
 * and returns a Response, or undefined to defer to the next route. If nothing
 * matches, a 404 is returned — no real network is ever touched.
 */
export function makeContext(...routes: Route[]): CheckContext {
  const fetchStub: typeof fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.toString();
    for (const route of routes) {
      const res = route(url);
      if (res) return res;
    }
    return errorResponse(404);
  };
  return { logger: nullLogger, getKey: () => undefined, fetch: fetchStub };
}

/** Route helper: match a URL substring. */
export function on(substring: string, res: Response): Route {
  return (url) => (url.includes(substring) ? res.clone() : undefined);
}
