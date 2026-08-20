import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { virustotalDomainCheck } from '../src/intel/virustotal.js';
import { shodanHostCheck } from '../src/intel/shodanHost.js';
import { makeContext, jsonResponse, on, withKeys } from './helpers.js';

const domain = { type: 'domain', value: 'evil.com' } as const;
const ip = { type: 'ip', value: '203.0.113.9' } as const;

describe('intel.virustotal_domain (BYOK)', () => {
  it('is skipped without a key', async () => {
    const out = await virustotalDomainCheck.run(domain, makeContext(), {});
    assert.equal(out.status, 'skipped');
  });

  it('raises a finding when engines flag the domain', async () => {
    const ctx = withKeys(
      makeContext(
        on(
          'virustotal.com',
          jsonResponse({
            data: {
              attributes: { last_analysis_stats: { malicious: 5, suspicious: 0 }, reputation: -10 },
            },
          }),
        ),
      ),
      { VIRUSTOTAL_API_KEY: 'k' },
    );
    const out = await virustotalDomainCheck.run(domain, ctx, {});
    assert.equal(out.status, 'finding');
    assert.equal(out.findings?.[0]?.severity, 'high');
  });
});

describe('intel.shodan_host (BYOK)', () => {
  it('is skipped without a key', async () => {
    const out = await shodanHostCheck.run(ip, makeContext(), {});
    assert.equal(out.status, 'skipped');
  });

  it('emits ports/org and CVE findings with a key', async () => {
    const ctx = withKeys(
      makeContext(
        on(
          'api.shodan.io',
          jsonResponse({ ports: [22, 443], vulns: ['CVE-2021-1'], org: 'ACME', hostnames: [] }),
        ),
      ),
      { SHODAN_API_KEY: 'k' },
    );
    const out = await shodanHostCheck.run(ip, ctx, {});
    assert.equal(out.status, 'finding');
    assert.ok(out.entities?.some((e) => e.type === 'org' && e.value === 'ACME'));
    assert.ok(out.entities?.some((e) => e.type === 'port'));
    assert.equal(out.findings?.[0]?.code, 'intel.shodan_vuln');
  });
});
