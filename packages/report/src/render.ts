/**
 * Markdown report rendering + a tamper-evident integrity block.
 *
 * `renderMarkdown` produces the body; `renderReport` appends an integrity
 * section carrying the SHA-256 of that body and the timestamp, so any later
 * edit to the content makes the digest no longer match.
 */

import type { Severity } from '@janus/core';
import type { ReportInput, RenderedReport, ReportTask } from './types.js';
import { sha256Hex } from './digest.js';

const SEVERITY_ORDER: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const SEVERITY_ICON: Record<Severity, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🔵',
  info: '⚪',
};

const STATUS_ICON: Record<string, string> = {
  clean: '✅',
  observation: '⚠️',
  finding: '❌',
  skipped: '⏭️',
  error: '💥',
};

function findingsSection(input: ReportInput): string {
  if (input.findings.length === 0) return '## Bulgular\n\n_Bulgu yok._\n';

  const lines = ['## Bulgular\n'];
  for (const severity of SEVERITY_ORDER) {
    const group = input.findings.filter((f) => f.severity === severity);
    if (group.length === 0) continue;
    lines.push(`### ${SEVERITY_ICON[severity]} ${severity} (${group.length})\n`);
    for (const f of group) {
      const where = f.entity ? ` — \`${f.entity.type}:${f.entity.value}\`` : '';
      lines.push(`- **[${f.code}]** ${f.title}${where}`);
      lines.push(`  ${f.description}`);
      for (const ref of f.references ?? []) {
        lines.push(`  - ${ref.url ? `[${ref.title}](${ref.url})` : ref.title}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function entitiesSection(input: ReportInput): string {
  const entries = Object.entries(input.entityTypes).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return '';
  const rows = entries.map(([type, count]) => `| ${type} | ${count} |`).join('\n');
  return `## Varlık dağılımı\n\n| tip | adet |\n| --- | ---: |\n${rows}\n`;
}

function checklistSection(tasks: readonly ReportTask[] | undefined): string {
  if (!tasks || tasks.length === 0) return '';
  const rows = tasks
    .map((t) => {
      const icon = STATUS_ICON[t.status] ?? '•';
      const detail = t.skippedReason ? 'kapsam dışı' : `${t.durationMs}ms`;
      return `| ${icon} | \`${t.checkId}\` | \`${t.target.type}:${t.target.value}\` | ${detail} |`;
    })
    .join('\n');
  return `## Kontrol listesi\n\n| durum | check | hedef | süre |\n| --- | --- | --- | --- |\n${rows}\n`;
}

/** Render the report body (no integrity block). */
export function renderMarkdown(input: ReportInput): string {
  const c = input.counts;
  const summary =
    `${c.tasks} kontrol · ${c.entities} varlık · ${c.edges} bağlantı · ` +
    `${c.observations} gözlem · **${c.findings} bulgu**`;

  const parts = [
    '# Janus Tarama Raporu\n',
    `- **Hedef:** \`${input.target.type}:${input.target.value}\``,
    `- **Profil:** \`${input.profileId}\``,
    `- **Tarih:** ${input.generatedAt}`,
    `- **Özet:** ${summary}\n`,
    findingsSection(input),
    entitiesSection(input),
    checklistSection(input.tasks),
    '---\n',
    '> ⚖️ Yalnızca yetkili olduğun varlıklarda kullan. Bu rapor bir kanıt kaydıdır; ' +
      'aşağıdaki SHA-256 özeti içerik bütünlüğünü doğrular.',
  ];
  return parts.filter(Boolean).join('\n');
}

/** Render the report and append a SHA-256 integrity block over the body. */
export async function renderReport(input: ReportInput): Promise<RenderedReport> {
  const body = renderMarkdown(input);
  const sha256 = await sha256Hex(body);
  const markdown = `${body}\n\n## Bütünlük\n\n- **SHA-256 (gövde):** \`${sha256}\`\n- **Üretim:** ${input.generatedAt}\n`;
  return { markdown, sha256, generatedAt: input.generatedAt };
}
