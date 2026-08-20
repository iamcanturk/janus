/**
 * JWT decoder — inspects header/payload/signature WITHOUT verifying (verifying
 * needs the key). Flags the `alg:none` downgrade footgun.
 */

const decoder = new TextDecoder();

function base64UrlDecode(part: string): string {
  const pad = part.length % 4 === 0 ? '' : '='.repeat(4 - (part.length % 4));
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return decoder.decode(bytes);
}

export interface DecodedJwt {
  readonly header: Record<string, unknown>;
  readonly payload: Record<string, unknown>;
  readonly signature: string;
  readonly warnings: string[];
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('A JWT must have three dot-separated parts');

  const header = JSON.parse(base64UrlDecode(parts[0]!)) as Record<string, unknown>;
  const payload = JSON.parse(base64UrlDecode(parts[1]!)) as Record<string, unknown>;
  const signature = parts[2]!;

  const warnings: string[] = [];
  const alg = typeof header.alg === 'string' ? header.alg.toLowerCase() : '';
  if (alg === 'none') warnings.push('alg: none — imzasız token kabul ediliyor olabilir (kritik).');
  if (!signature) warnings.push('İmza bölümü boş.');
  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
    warnings.push('Token süresi dolmuş (exp geçmişte).');
  }

  return { header, payload, signature, warnings };
}
