/**
 * Hashing via Web Crypto (SubtleCrypto) — isomorphic and async. MD5 is
 * intentionally omitted (not offered by Web Crypto and cryptographically dead).
 */

export const HASH_ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

const encoder = new TextEncoder();

/** Hex-encoded digest of `input` under the given algorithm. */
export async function hash(algorithm: HashAlgorithm, input: string): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, encoder.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compute every supported hash at once. */
export async function hashAll(input: string): Promise<Record<HashAlgorithm, string>> {
  const entries = await Promise.all(
    HASH_ALGORITHMS.map(async (algo) => [algo, await hash(algo, input)] as const),
  );
  return Object.fromEntries(entries) as Record<HashAlgorithm, string>;
}

/** Best-effort identification of a hash by its hex length. */
export function identifyHash(value: string): string[] {
  const v = value.trim();
  if (!/^[0-9a-fA-F]+$/.test(v)) return [];
  const byLength: Record<number, string[]> = {
    32: ['MD5', 'NTLM'],
    40: ['SHA-1'],
    64: ['SHA-256'],
    96: ['SHA-384'],
    128: ['SHA-512'],
  };
  return byLength[v.length] ?? [];
}
