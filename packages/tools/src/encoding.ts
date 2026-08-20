/**
 * Encoding helpers — Base64 / Hex / URL, plus defang/refang. Isomorphic and
 * pure: they run in the browser and in Node with no dependencies.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(input: string): string {
  const bytes = encoder.encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(b64: string): string {
  const binary = atob(b64.trim());
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return decoder.decode(bytes);
}

export function toHex(input: string): string {
  return [...encoder.encode(input)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 !== 0) throw new Error('Hex length must be even');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error('Invalid hex');
    bytes[i] = byte;
  }
  return decoder.decode(bytes);
}

export function urlEncode(input: string): string {
  return encodeURIComponent(input);
}

export function urlDecode(input: string): string {
  return decodeURIComponent(input);
}

/** Make an IOC safe to paste (hxxp, [.], [:]). */
export function defang(input: string): string {
  return input
    .replace(/http/gi, (m) => (m[0] === 'H' ? 'Hxxp' : 'hxxp'))
    .replace(/:\/\//g, '[://]')
    .replace(/\./g, '[.]')
    .replace(/@/g, '[at]');
}

/** Reverse {@link defang}. */
export function refang(input: string): string {
  return input
    .replace(/\[\.\]/g, '.')
    .replace(/\[:\/\/\]/g, '://')
    .replace(/\[at\]/gi, '@')
    .replace(/hxxp/gi, (m) => (m[0] === 'H' ? 'Http' : 'http'))
    .replace(/\[:\]/g, ':');
}
