import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runScan, selectChecks, CheckRegistry, resolveProfile } from '@janus/core';
import type { CheckConfig } from '@janus/core';
import { httpProbeCheck, extractTitle } from '../src/enumeration/httpProbe.js';
import { portScanCheck } from '../src/enumeration/portScan.js';
import { mapLimit } from '../src/net/limit.js';
import { makeContext } from './helpers.js';

const ip = { type: 'ip', value: '203.0.113.9' } as const;

function htmlResponse(server: string, title: string): Response {
  return new Response(`<html><head><title>${title}</title></head></html>`, {
    status: 200,
    headers: { 'content-type': 'text/html', server },
  });
}

describe('mapLimit', () => {
  it('runs all items and preserves order, capping concurrency', async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return n * 2;
    });
    assert.deepEqual(out, [2, 4, 6, 8, 10]);
    assert.ok(peak <= 2, `peak concurrency ${peak} exceeded 2`);
  });
});

describe('host.http_probe (active)', () => {
  it('extracts a page title', () => {
    assert.equal(extractTitle('<title> Hello  World </title>'), 'Hello World');
    assert.equal(extractTitle('<p>no title</p>'), undefined);
  });

  it('emits service + technology entities from a live response', async () => {
    const ctx = makeContext((url) =>
      url.startsWith('http://') ? htmlResponse('nginx', 'Home') : undefined,
    );
    const res = await httpProbeCheck.run(ip, ctx, {});
    assert.equal(res.status, 'observation');
    assert.ok(res.entities?.some((e) => e.type === 'service'));
    assert.ok(res.entities?.some((e) => e.type === 'technology' && e.value === 'nginx'));
  });

  it('is clean when nothing answers', async () => {
    const ctx = makeContext(() => undefined); // every fetch -> 404, then thrown? returns 404 Response
    // Force fetch to reject so both schemes fail.
    const rejecting = {
      ...ctx,
      fetch: (() => Promise.reject(new Error('refused'))) as typeof fetch,
    };
    const res = await httpProbeCheck.run(ip, rejecting, {});
    assert.equal(res.status, 'clean');
  });
});

describe('net.port_scan (active)', () => {
  it('reports open ports via an injected probe (no real sockets)', async () => {
    const config: CheckConfig = {
      options: {
        ports: [22, 80, 443],
        probePort: async (_host: string, port: number) => port === 80 || port === 443,
      },
    };
    const res = await portScanCheck.run(ip, makeContext(), config);
    assert.equal(res.status, 'observation');
    const ports = res.entities?.filter((e) => e.type === 'port').map((e) => e.value) ?? [];
    assert.deepEqual(ports.sort(), ['203.0.113.9:443', '203.0.113.9:80']);
  });

  it('is clean when no port is open', async () => {
    const config: CheckConfig = { options: { ports: [22], probePort: async () => false } };
    const res = await portScanCheck.run(ip, makeContext(), config);
    assert.equal(res.status, 'clean');
  });
});

describe('safety gate for active checks', () => {
  it('excludes active checks under pasif-recon, includes them under bug-bounty-surface', () => {
    const reg = new CheckRegistry();
    reg.registerAll([httpProbeCheck, portScanCheck]);
    assert.equal(selectChecks(reg, resolveProfile('pasif-recon')).length, 0);
    assert.equal(selectChecks(reg, resolveProfile('bug-bounty-surface')).length, 2);
  });

  it('runScan never runs an active check under a passive profile', async () => {
    const reg = new CheckRegistry();
    reg.registerAll([httpProbeCheck, portScanCheck]);
    const report = await runScan(reg, 'pasif-recon', ip, { context: makeContext() });
    assert.equal(report.tasks.length, 0);
  });

  it('runScan runs active checks under bug-bounty-surface with injected probes', async () => {
    const reg = new CheckRegistry();
    reg.registerAll([httpProbeCheck, portScanCheck]);
    const ctx = makeContext((url) =>
      url.startsWith('http') ? htmlResponse('caddy', 'X') : undefined,
    );
    const report = await runScan(reg, 'bug-bounty-surface', ip, {
      context: ctx,
      config: { options: { ports: [443], probePort: async () => true } },
    });
    assert.ok(
      report.tasks.some((t) => t.checkId === 'net.port_scan' && t.status === 'observation'),
    );
    assert.ok(report.tasks.some((t) => t.checkId === 'host.http_probe'));
    assert.ok(report.entities.some((e) => e.type === 'port'));
  });
});
