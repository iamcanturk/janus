/**
 * Password strength + secure generators. Uses Web Crypto (isomorphic).
 */

export interface PasswordStrength {
  readonly length: number;
  readonly charsetSize: number;
  readonly bits: number;
  readonly verdict: string;
}

export function passwordStrength(pw: string): PasswordStrength {
  let size = 0;
  if (/[a-z]/.test(pw)) size += 26;
  if (/[A-Z]/.test(pw)) size += 26;
  if (/[0-9]/.test(pw)) size += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) size += 33;
  const bits = pw.length > 0 && size > 0 ? Math.round(pw.length * Math.log2(size)) : 0;
  const verdict =
    bits >= 100
      ? 'çok güçlü'
      : bits >= 70
        ? 'güçlü'
        : bits >= 45
          ? 'orta'
          : bits > 0
            ? 'zayıf'
            : '—';
  return { length: pw.length, charsetSize: size, bits, verdict };
}

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?',
};

export interface PasswordOptions {
  length?: number;
  lower?: boolean;
  upper?: boolean;
  digits?: boolean;
  symbols?: boolean;
}

export function generatePassword(opts: PasswordOptions = {}): string {
  const length = Math.min(Math.max(opts.length ?? 20, 4), 256);
  let pool = '';
  if (opts.lower ?? true) pool += SETS.lower;
  if (opts.upper ?? true) pool += SETS.upper;
  if (opts.digits ?? true) pool += SETS.digits;
  if (opts.symbols ?? true) pool += SETS.symbols;
  if (!pool) pool = SETS.lower;
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += pool[bytes[i]! % pool.length];
  return out;
}

export function generateToken(bytes = 32, format: 'hex' | 'base64url' = 'hex'): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  if (format === 'hex') return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
  let bin = '';
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function uuidv4(): string {
  return crypto.randomUUID();
}
