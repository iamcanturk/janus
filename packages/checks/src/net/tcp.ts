/**
 * TCP connect probe — the primitive behind the active port scan.
 *
 * A "connect" scan: it opens a full TCP handshake and immediately closes it. It
 * sends no payload and does nothing destructive. Still active — only run it
 * against authorized targets.
 */

import net from 'node:net';

export type PortProbe = (host: string, port: number, timeoutMs: number) => Promise<boolean>;

/** Resolves true if a TCP connection to host:port succeeds within the timeout. */
export const tcpProbe: PortProbe = (host, port, timeoutMs) =>
  new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (open: boolean): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });

/** Common ports worth a quick connect check. */
export const COMMON_PORTS: readonly number[] = [
  21, 22, 25, 53, 80, 110, 143, 443, 445, 587, 993, 995, 3306, 3389, 5432, 6379, 8080, 8443, 9200,
  27017,
];

/** Best-effort service label for a well-known port. */
export function serviceName(port: number): string | undefined {
  const map: Record<number, string> = {
    21: 'ftp',
    22: 'ssh',
    25: 'smtp',
    53: 'dns',
    80: 'http',
    110: 'pop3',
    143: 'imap',
    443: 'https',
    445: 'smb',
    587: 'smtp',
    993: 'imaps',
    995: 'pop3s',
    3306: 'mysql',
    3389: 'rdp',
    5432: 'postgresql',
    6379: 'redis',
    8080: 'http-alt',
    8443: 'https-alt',
    9200: 'elasticsearch',
    27017: 'mongodb',
  };
  return map[port];
}
