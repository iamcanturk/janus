/**
 * BYOK secret encryption (AES-256-GCM).
 *
 * Keys are stored encrypted at rest and never logged or sent to third parties.
 * The wrapping key is derived from `ENCRYPTION_KEY` (see .env.example). Token
 * format: base64(iv).base64(authTag).base64(ciphertext).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

function deriveKey(secret: string): Buffer {
  if (!secret) throw new Error('ENCRYPTION_KEY is empty');
  return scryptSync(secret, 'janus-byok-v1', 32);
}

export function encryptSecret(plaintext: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString('base64')).join('.');
}

export function decryptSecret(token: string, secret: string): string {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed secret token');
  const [ivB64, tagB64, encB64] = parts as [string, string, string];
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]).toString(
    'utf8',
  );
}
