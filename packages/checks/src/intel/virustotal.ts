/**
 * intel.virustotal_domain — PASSIVE, BYOK. Looks up a domain's reputation on
 * VirusTotal. Skipped when no VIRUSTOTAL_API_KEY is set. A flagged domain
 * becomes a finding whose severity scales with the number of engines.
 */

import { defineCheck } from '@janus/core';
import type { Finding } from '@janus/core';
import { vtDomainReport } from '@janus/connectors';

export const virustotalDomainCheck = defineCheck({
  id: 'intel.virustotal_domain',
  phase: 'intel',
  mode: 'passive',
  inputs: ['domain', 'subdomain'],
  produces: [],
  source: 'VirusTotal v3 (BYOK)',
  needsKey: true,
  title: 'VirusTotal itibar',
  description: 'Alan adının VirusTotal motorlarındaki itibarını sorgular (BYOK).',
  run: async (target, ctx) => {
    const key = ctx.getKey('VIRUSTOTAL_API_KEY');
    if (!key) return { status: 'skipped' };

    const report = await vtDomainReport(ctx, key, target.value);
    if (!report) return { status: 'skipped' };

    const findings: Finding[] = [];
    if (report.malicious > 0 || report.suspicious > 0) {
      const flagged = report.malicious + report.suspicious;
      findings.push({
        code: 'intel.vt_flagged',
        title: `VirusTotal: ${flagged} motor işaretledi`,
        severity: report.malicious >= 3 ? 'high' : 'medium',
        entity: target,
        description: `${report.malicious} zararlı / ${report.suspicious} şüpheli tespit (itibar ${report.reputation}).`,
        references: [
          {
            title: 'VirusTotal',
            url: `https://www.virustotal.com/gui/domain/${encodeURIComponent(target.value)}`,
          },
        ],
      });
    }

    return {
      status: findings.length > 0 ? 'finding' : 'observation',
      observations: [{ kind: 'virustotal.stats', entity: target, data: { ...report } }],
      findings,
    };
  },
});
