/**
 * @janus/checks — all scanning modules, grouped by phase and mode.
 *
 * `allChecks` is the registry manifest. Adding a module means adding its file
 * and appending it here — the only edit outside the module's own file.
 */

import { CheckRegistry } from '@janus/core';
import type { CheckDefinition } from '@janus/core';

import { rdapCheck } from './scope/rdap.js';
import { crtNameCheck } from './recon/crtName.js';
import { dnsCheck } from './recon/dns.js';
import { waybackCheck } from './recon/wayback.js';
import { internetdbCheck } from './recon/internetdb.js';
import { httpProbeCheck } from './enumeration/httpProbe.js';
import { portScanCheck } from './enumeration/portScan.js';
import { cisaKevCheck } from './intel/cisaKev.js';
import { virustotalDomainCheck } from './intel/virustotal.js';
import { shodanHostCheck } from './intel/shodanHost.js';
import { securityHeadersCheck } from './exposure/securityHeaders.js';
import { tlsHealthCheck } from './exposure/tlsHealth.js';
import { caaCheck } from './recon/caa.js';
import { reverseDnsCheck } from './recon/reverseDns.js';
import { asnCheck } from './scope/asn.js';
import { gitExposureCheck } from './exposure/gitExposure.js';
import { envExposureCheck } from './exposure/envExposure.js';
import { robotsCheck } from './enumeration/robots.js';
import { securityTxtCheck } from './exposure/securityTxt.js';

/** Every check shipped with Janus. Append new modules here. */
export const allChecks: readonly CheckDefinition[] = [
  // Passive
  asnCheck,
  rdapCheck,
  crtNameCheck,
  dnsCheck,
  caaCheck,
  reverseDnsCheck,
  waybackCheck,
  internetdbCheck,
  cisaKevCheck,
  // Passive, BYOK (skipped without a key)
  virustotalDomainCheck,
  shodanHostCheck,
  // Active (only run under a profile with allowActive)
  httpProbeCheck,
  portScanCheck,
  robotsCheck,
  securityHeadersCheck,
  tlsHealthCheck,
  gitExposureCheck,
  envExposureCheck,
  securityTxtCheck,
];

/** Build a registry pre-loaded with every shipped check. */
export function createRegistry(): CheckRegistry {
  const registry = new CheckRegistry();
  registry.registerAll(allChecks);
  return registry;
}

export { rdapCheck, crtNameCheck, dnsCheck, waybackCheck, internetdbCheck };
export { httpProbeCheck } from './enumeration/httpProbe.js';
export { portScanCheck } from './enumeration/portScan.js';
export { securityHeadersCheck } from './exposure/securityHeaders.js';
export { tlsHealthCheck } from './exposure/tlsHealth.js';
export { cisaKevCheck, resetKevCache } from './intel/cisaKev.js';
export { virustotalDomainCheck } from './intel/virustotal.js';
export { shodanHostCheck } from './intel/shodanHost.js';
export { caaCheck } from './recon/caa.js';
export { reverseDnsCheck } from './recon/reverseDns.js';
export { asnCheck } from './scope/asn.js';
export { gitExposureCheck } from './exposure/gitExposure.js';
export { envExposureCheck } from './exposure/envExposure.js';
export { robotsCheck } from './enumeration/robots.js';
export { securityTxtCheck } from './exposure/securityTxt.js';
export { mapLimit } from './net/limit.js';
export { tcpProbe, COMMON_PORTS, serviceName } from './net/tcp.js';
export type { PortProbe } from './net/tcp.js';
export { fetchJson, fetchText, HttpError, USER_AGENT } from './http.js';
export const CHECKS_PACKAGE = '@janus/checks';
