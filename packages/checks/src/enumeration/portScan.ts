/**
 * net.port_scan — ACTIVE. A TCP connect scan of common ports on a target IP.
 * Opens and immediately closes a handshake per port; sends no payload and does
 * nothing destructive. Rate-limited via `config.rateLimitPerSec`. Never runs in
 * a passive profile (runner safety gate).
 *
 * The connect primitive is injectable through `config.options.probePort` so
 * tests exercise the logic without opening real sockets.
 */

import { defineCheck } from '@janus/core';
import type { EntityInput, EdgeInput, Observation } from '@janus/core';
import { mapLimit } from '../net/limit.js';
import { COMMON_PORTS, serviceName, tcpProbe } from '../net/tcp.js';
import type { PortProbe } from '../net/tcp.js';

const DEFAULT_PORT_TIMEOUT_MS = 3000;
const DEFAULT_RATE_PER_SEC = 20;

export const portScanCheck = defineCheck({
  id: 'net.port_scan',
  phase: 'enumeration',
  mode: 'active',
  risk: 'medium',
  inputs: ['ip'],
  produces: ['port', 'service'],
  source: 'live TCP connect to target',
  needsKey: false,
  title: 'Port tarama (TCP connect)',
  description: 'Yaygın portlara canlı TCP bağlantı denemesi; açık portları listeler.',
  run: async (target, _ctx, config) => {
    const options = config.options ?? {};
    const ports = (options.ports as number[] | undefined) ?? COMMON_PORTS;
    const probe = (options.probePort as PortProbe | undefined) ?? tcpProbe;
    const timeoutMs = (options.portTimeoutMs as number | undefined) ?? DEFAULT_PORT_TIMEOUT_MS;
    const concurrency = Math.max(1, config.rateLimitPerSec ?? DEFAULT_RATE_PER_SEC);

    const results = await mapLimit(ports, concurrency, async (port) => ({
      port,
      open: await probe(target.value, port, timeoutMs),
    }));

    const open = results.filter((r) => r.open).map((r) => r.port);
    if (open.length === 0) return { status: 'clean' };

    const entities: EntityInput[] = [];
    const edges: EdgeInput[] = [];
    for (const port of open) {
      const value = `${target.value}:${port}`;
      const service = serviceName(port);
      entities.push({ type: 'port', value, meta: { port, service } });
      edges.push({ from: target, to: { type: 'port', value }, relation: 'exposes' });
      if (service)
        entities.push({ type: 'service', value: `${service}://${value}`, meta: { port } });
    }

    const observations: Observation[] = [
      {
        kind: 'port.open',
        entity: target,
        data: { ports: open, services: open.map((p) => serviceName(p) ?? String(p)) },
        message: `${open.length} açık port: ${open.join(', ')}`,
      },
    ];

    return { status: 'observation', entities, edges, observations };
  },
});
