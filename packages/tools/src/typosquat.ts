/**
 * Typosquat / look-alike domain generator for phishing-surface research. Pure.
 */

const ADJACENT: Record<string, string> = {
  a: 'qsz',
  e: 'wrd',
  i: 'uok',
  o: 'ipl',
  s: 'ad',
  n: 'mb',
  r: 'et',
  l: 'kp',
};
const HOMOGLYPH: Record<string, string> = { o: '0', l: '1', i: '1', e: '3', a: '4', s: '5' };

export function buildTyposquats(domain: string): string[] {
  const d = domain.trim().toLowerCase();
  const dot = d.lastIndexOf('.');
  if (dot < 1) return [];
  const name = d.slice(0, dot);
  const tld = d.slice(dot);
  const out = new Set<string>();
  const add = (n: string) => n && n !== name && out.add(n + tld);

  for (let i = 0; i < name.length; i++) {
    add(name.slice(0, i) + name.slice(i + 1)); // omission
    add(name.slice(0, i) + name[i] + name.slice(i)); // repetition
    if (i < name.length - 1) add(name.slice(0, i) + name[i + 1] + name[i] + name.slice(i + 2)); // transpose
    const ch = name[i]!;
    for (const r of ADJACENT[ch] ?? '') add(name.slice(0, i) + r + name.slice(i + 1)); // adjacent
    if (HOMOGLYPH[ch]) add(name.slice(0, i) + HOMOGLYPH[ch] + name.slice(i + 1)); // homoglyph
  }
  for (const t of ['.net', '.org', '.co', '.io', '.info', '.xyz']) {
    if (t !== tld) out.add(name + t); // tld swap
  }
  return [...out].sort();
}
