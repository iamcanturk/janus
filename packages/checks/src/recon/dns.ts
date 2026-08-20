/**
 * dns.records — DNS posture via DNS-over-HTTPS (Cloudflare). Passive: the query
 * goes to a public resolver, not to the target. Resolves A/MX/NS/TXT, seeds IP
 * entities from A records, and raises findings for a missing SPF or DMARC
 * policy (an email-spoofing exposure).
 */

import { defineCheck } from '@janus/core';
import type {
  CheckContext,
  EntityInput,
  EdgeInput,
  Observation,
  Finding,
  Target,
} from '@janus/core';
import { fetchJson } from '../http.js';

const DOH_URL = 'https://cloudflare-dns.com/dns-query';

interface DohAnswer {
  readonly name: string;
  readonly type: number;
  readonly data: string;
}
interface DohResponse {
  readonly Status: number;
  readonly Answer?: readonly DohAnswer[];
}

async function query(ctx: CheckContext, name: string, type: string): Promise<DohAnswer[]> {
  const url = `${DOH_URL}?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetchJson<DohResponse>(ctx, url, {
    headers: { Accept: 'application/dns-json' },
  });
  return [...(res.Answer ?? [])];
}

/** Strip surrounding quotes DoH puts around TXT records. */
function unquote(txt: string): string {
  return txt.replace(/^"|"$/g, '').replace(/""/g, '');
}

export const dnsCheck = defineCheck({
  id: 'dns.records',
  phase: 'recon',
  mode: 'passive',
  inputs: ['domain', 'subdomain'],
  produces: ['dns_record', 'ip'],
  source: 'DNS-over-HTTPS (Cloudflare)',
  needsKey: false,
  title: 'DNS kayıtları + SPF/DMARC',
  description: 'A/MX/NS/TXT kayıtları ve e-posta koruma (SPF/DMARC) politikası.',
  run: async (target, ctx) => {
    const [a, mx, ns, txt, dmarc] = await Promise.all([
      query(ctx, target.value, 'A'),
      query(ctx, target.value, 'MX'),
      query(ctx, target.value, 'NS'),
      query(ctx, target.value, 'TXT'),
      query(ctx, `_dmarc.${target.value}`, 'TXT'),
    ]);

    const entities: EntityInput[] = [];
    const edges: EdgeInput[] = [];
    const observations: Observation[] = [];
    const findings: Finding[] = [];

    for (const rec of a) {
      entities.push({ type: 'ip', value: rec.data });
      edges.push({ from: target, to: { type: 'ip', value: rec.data }, relation: 'resolves_to' });
    }

    const record = (kind: string, rows: DohAnswer[]) => {
      if (rows.length > 0) {
        observations.push({
          kind: `dns.${kind}`,
          entity: target,
          data: { records: rows.map((r) => r.data) },
        });
      }
    };
    record('a', a);
    record('mx', mx);
    record('ns', ns);

    const txtValues = txt.map((r) => unquote(r.data));
    if (txtValues.length > 0)
      observations.push({ kind: 'dns.txt', entity: target, data: { records: txtValues } });

    // Email protection findings — only meaningful for the apex domain.
    const isApex = target.type === 'domain';
    if (isApex) {
      addPolicyFindings(
        target,
        txtValues,
        dmarc.map((r) => unquote(r.data)),
        findings,
      );
    }

    if (findings.length > 0) return { status: 'finding', entities, edges, observations, findings };
    if (observations.length > 0 || entities.length > 0)
      return { status: 'observation', entities, edges, observations };
    return { status: 'clean' };
  },
});

function addPolicyFindings(
  target: Target,
  txtValues: string[],
  dmarcValues: string[],
  findings: Finding[],
): void {
  const hasSpf = txtValues.some((v) => v.toLowerCase().startsWith('v=spf1'));
  const hasDmarc = dmarcValues.some((v) => v.toLowerCase().startsWith('v=dmarc1'));

  if (!hasSpf) {
    findings.push({
      code: 'dns.spf_missing',
      title: 'SPF kaydı yok',
      severity: 'low',
      entity: target,
      description:
        'Alan adında SPF (v=spf1) kaydı bulunamadı. E-posta sahteciliğine (spoofing) açık olabilir.',
      references: [{ title: 'RFC 7208 — SPF', url: 'https://www.rfc-editor.org/rfc/rfc7208' }],
    });
  }
  if (!hasDmarc) {
    findings.push({
      code: 'dns.dmarc_missing',
      title: 'DMARC politikası yok',
      severity: 'low',
      entity: target,
      description:
        '_dmarc kaydında DMARC (v=DMARC1) politikası bulunamadı. Alan adı adına gönderilen sahte e-postalar denetlenemez.',
      references: [{ title: 'RFC 7489 — DMARC', url: 'https://www.rfc-editor.org/rfc/rfc7489' }],
    });
  }
}
