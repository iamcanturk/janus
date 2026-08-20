/**
 * TLS certificate inspection — the primitive behind the active TLS health
 * check. Opens a TLS connection and reads the peer certificate. Active, but
 * non-destructive (a normal handshake). Injectable so tests need no network.
 */

import tls from 'node:tls';

export interface CertInfo {
  readonly subject?: string;
  readonly issuer?: string;
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly daysRemaining?: number;
  readonly selfSigned: boolean;
  readonly authorized: boolean;
  readonly authorizationError?: string;
}

export type TlsConnect = (
  host: string,
  port: number,
  timeoutMs: number,
) => Promise<CertInfo | undefined>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Certificate name fields can be multi-valued; take the first. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Live TLS connect that returns certificate details (or undefined on failure). */
export const tlsConnect: TlsConnect = (host, port, timeoutMs) =>
  new Promise<CertInfo | undefined>((resolve) => {
    let settled = false;
    const done = (info: CertInfo | undefined): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(info);
    };

    const socket = tls.connect(
      { host, port, servername: host, rejectUnauthorized: false, timeout: timeoutMs },
      () => {
        const cert = socket.getPeerCertificate();
        const authError = socket.authorized
          ? undefined
          : (socket.authorizationError?.message ?? String(socket.authorizationError));
        if (!cert || Object.keys(cert).length === 0) return done(undefined);
        const validTo = cert.valid_to ? new Date(cert.valid_to) : undefined;
        const daysRemaining = validTo
          ? Math.floor((validTo.getTime() - Date.now()) / DAY_MS)
          : undefined;
        const subjectCn = first(cert.subject?.CN);
        const issuerCn = first(cert.issuer?.CN);
        done({
          subject: subjectCn,
          issuer: issuerCn,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysRemaining,
          selfSigned: Boolean(subjectCn && subjectCn === issuerCn),
          authorized: socket.authorized,
          authorizationError: authError,
        });
      },
    );

    socket.setTimeout(timeoutMs, () => done(undefined));
    socket.once('timeout', () => done(undefined));
    socket.once('error', () => done(undefined));
  });
