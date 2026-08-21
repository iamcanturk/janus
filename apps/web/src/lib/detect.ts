/** Auto-detect the target entity type from raw user input. */

export type DetectedType = 'domain' | 'ip' | 'unknown';

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

/** Normalize a target: strip scheme, path, port, whitespace and a trailing dot. */
export function normalizeTarget(raw: string): string {
  let v = raw.trim().toLowerCase();
  v = v.replace(/^[a-z]+:\/\//, ''); // scheme
  v = v.replace(/[/?#].*$/, ''); // path/query/fragment
  v = v.replace(/:\d+$/, ''); // :port
  v = v.replace(/\.$/, ''); // trailing dot
  return v;
}

export function detectType(raw: string): DetectedType {
  const v = normalizeTarget(raw);
  if (!v) return 'unknown';
  if (IPV4.test(v)) return 'ip';
  if (DOMAIN.test(v)) return 'domain';
  return 'unknown';
}
