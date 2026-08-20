/**
 * IOC extractor — pull indicators of compromise out of free text. Refangs the
 * input first so defanged indicators (hxxp, 1[.]2[.]3[.]4) are still caught.
 */

import { refang } from './encoding.js';

export interface Iocs {
  readonly ipv4: string[];
  readonly domains: string[];
  readonly urls: string[];
  readonly emails: string[];
  readonly md5: string[];
  readonly sha1: string[];
  readonly sha256: string[];
}

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const IPV4_ONLY = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const URL = /\bhttps?:\/\/[^\s"'<>()]+/gi;
const EMAIL = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;
const DOMAIN = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
const MD5 = /\b[a-f0-9]{32}\b/gi;
const SHA1 = /\b[a-f0-9]{40}\b/gi;
const SHA256 = /\b[a-f0-9]{64}\b/gi;

function uniqueMatches(text: string, re: RegExp): string[] {
  return [...new Set(text.match(re) ?? [])];
}

export function extractIocs(rawText: string): Iocs {
  const text = refang(rawText);

  const urls = uniqueMatches(text, URL);
  const emails = uniqueMatches(text, EMAIL);
  const ipv4 = uniqueMatches(text, IPV4);

  // Domains: drop ones that are actually part of an email or a bare IP.
  const emailDomains = new Set(emails.map((e) => e.split('@')[1]?.toLowerCase()));
  const domains = uniqueMatches(text, DOMAIN).filter(
    (d) => !IPV4_ONLY.test(d) && !emailDomains.has(d.toLowerCase()),
  );

  return {
    ipv4,
    urls,
    emails,
    domains,
    md5: uniqueMatches(text, MD5),
    sha1: uniqueMatches(text, SHA1),
    sha256: uniqueMatches(text, SHA256),
  };
}
