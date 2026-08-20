/**
 * IPv4 CIDR calculator — pure integer math, no dependencies.
 */

export interface CidrInfo {
  readonly cidr: string;
  readonly prefix: number;
  readonly netmask: string;
  readonly network: string;
  readonly broadcast: string;
  readonly firstHost: string;
  readonly lastHost: string;
  readonly totalAddresses: number;
  readonly usableHosts: number;
}

function ipToInt(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) throw new Error(`Invalid IPv4 address: ${ip}`);
  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      throw new Error(`Invalid IPv4 octet: ${part}`);
    }
    value = value * 256 + octet;
  }
  return value >>> 0;
}

function intToIp(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join('.');
}

export function parseCidr(input: string): CidrInfo {
  const [ip, prefixRaw] = input.trim().split('/');
  if (!ip || prefixRaw === undefined) throw new Error('Expected "a.b.c.d/prefix"');
  const prefix = Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('Prefix must be between 0 and 32');
  }

  const ipInt = ipToInt(ip);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const totalAddresses = 2 ** (32 - prefix);

  const hasHostRange = prefix <= 30;
  return {
    cidr: `${intToIp(network)}/${prefix}`,
    prefix,
    netmask: intToIp(mask),
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    firstHost: intToIp(hasHostRange ? (network + 1) >>> 0 : network),
    lastHost: intToIp(hasHostRange ? (broadcast - 1) >>> 0 : broadcast),
    totalAddresses,
    usableHosts: hasHostRange ? totalAddresses - 2 : totalAddresses,
  };
}
