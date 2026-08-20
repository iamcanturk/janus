/**
 * Human-readable rendering of a monitoring diff between two scans.
 */

import type { ScanDiff } from '@janus/core';

export interface DiffMeta {
  readonly target: { readonly type: string; readonly value: string };
  readonly profileId: string;
  readonly generatedAt: string;
}

/** One-line summary suitable for a notification. */
export function summarizeDiff(diff: ScanDiff, meta: DiffMeta): string {
  if (!diff.changed) return `Janus: ${meta.target.type}:${meta.target.value} — değişiklik yok.`;
  const parts = [
    diff.addedEntities.length ? `+${diff.addedEntities.length} varlık` : '',
    diff.removedEntities.length ? `-${diff.removedEntities.length} varlık` : '',
    diff.addedFindings.length ? `+${diff.addedFindings.length} bulgu` : '',
    diff.removedFindings.length ? `-${diff.removedFindings.length} bulgu` : '',
  ].filter(Boolean);
  return `Janus: ${meta.target.type}:${meta.target.value} değişti — ${parts.join(', ')}.`;
}

function entityList(title: string, entities: ScanDiff['addedEntities']): string {
  if (entities.length === 0) return '';
  const rows = entities.map((e) => `- \`${e.type}:${e.value}\``).join('\n');
  return `### ${title} (${entities.length})\n\n${rows}\n`;
}

function findingList(title: string, findings: ScanDiff['addedFindings']): string {
  if (findings.length === 0) return '';
  const rows = findings
    .map((f) => `- **[${f.severity}]** ${f.title}${f.entity ? ` — \`${f.entity.value}\`` : ''}`)
    .join('\n');
  return `### ${title} (${findings.length})\n\n${rows}\n`;
}

/** Full Markdown delta between two runs. */
export function renderDiffMarkdown(diff: ScanDiff, meta: DiffMeta): string {
  const parts = [
    '# Janus İzleme — Değişiklik Raporu\n',
    `- **Hedef:** \`${meta.target.type}:${meta.target.value}\``,
    `- **Profil:** \`${meta.profileId}\``,
    `- **Tarih:** ${meta.generatedAt}`,
    `- **Özet:** ${summarizeDiff(diff, meta)}\n`,
  ];
  if (!diff.changed) {
    parts.push('_Önceki taramaya göre değişiklik yok._');
    return parts.join('\n');
  }
  parts.push(
    findingList('🆕 Yeni bulgular', diff.addedFindings),
    findingList('✅ Kapanan bulgular', diff.removedFindings),
    entityList('🆕 Yeni varlıklar', diff.addedEntities),
    entityList('➖ Kaybolan varlıklar', diff.removedEntities),
  );
  return parts.filter(Boolean).join('\n');
}
