/**
 * Standalone, print-friendly HTML report. The browser's "Save as PDF" turns
 * this into a PDF — no PDF dependency required.
 */

import type { Severity } from '@janus/core';
import type { ReportInput } from './types.js';

const SEVERITY_ORDER: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const SEVERITY_BG: Record<Severity, string> = {
  critical: '#b91c1c',
  high: '#c2410c',
  medium: '#b45309',
  low: '#0369a1',
  info: '#475569',
};

/** Escape text for safe HTML interpolation. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findingsHtml(input: ReportInput): string {
  if (input.findings.length === 0) return '<p class="muted">Bulgu yok.</p>';
  const items: string[] = [];
  for (const severity of SEVERITY_ORDER) {
    for (const f of input.findings.filter((x) => x.severity === severity)) {
      const where = f.entity ? ` — <code>${escapeHtml(f.entity.value)}</code>` : '';
      items.push(
        `<li><span class="sev" style="background:${SEVERITY_BG[severity]}">${severity}</span> ` +
          `<strong>${escapeHtml(f.title)}</strong>${where}<br><span class="muted">${escapeHtml(f.description)}</span></li>`,
      );
    }
  }
  return `<ul class="findings">${items.join('')}</ul>`;
}

function entitiesHtml(input: ReportInput): string {
  const rows = Object.entries(input.entityTypes)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `<tr><td>${escapeHtml(type)}</td><td class="num">${count}</td></tr>`)
    .join('');
  return rows
    ? `<table><thead><tr><th>tip</th><th>adet</th></tr></thead><tbody>${rows}</tbody></table>`
    : '';
}

/** Render a complete, self-contained HTML document for the report. */
export function renderHtml(input: ReportInput): string {
  const c = input.counts;
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<title>Janus Raporu — ${escapeHtml(input.target.value)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: system-ui, sans-serif; color: #0f172a; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
  h1 { margin-bottom: .25rem; }
  .muted { color: #64748b; }
  code { background: #f1f5f9; padding: 0 .25rem; border-radius: 4px; }
  .sev { color: #fff; padding: 1px 6px; border-radius: 4px; font-size: 11px; text-transform: uppercase; }
  ul.findings { list-style: none; padding: 0; }
  ul.findings li { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #e2e8f0; padding: 4px 10px; text-align: left; }
  td.num { text-align: right; }
  .meta { margin: 0; padding: 0; list-style: none; }
  footer { margin-top: 2rem; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
  @media print { body { margin: 0; } @page { margin: 1.5cm; } }
</style></head>
<body>
  <h1>Janus Tarama Raporu</h1>
  <ul class="meta muted">
    <li><strong>Hedef:</strong> <code>${escapeHtml(input.target.type)}:${escapeHtml(input.target.value)}</code></li>
    <li><strong>Profil:</strong> <code>${escapeHtml(input.profileId)}</code></li>
    <li><strong>Tarih:</strong> ${escapeHtml(input.generatedAt)}</li>
    <li><strong>Özet:</strong> ${c.tasks} kontrol · ${c.entities} varlık · ${c.edges} bağlantı · ${c.observations} gözlem · <strong>${c.findings} bulgu</strong></li>
  </ul>
  <h2>Bulgular</h2>
  ${findingsHtml(input)}
  <h2>Varlık dağılımı</h2>
  ${entitiesHtml(input)}
  <footer>⚖️ Yalnızca yetkili olduğun varlıklarda kullan. Kişisel veriler KVKK/GDPR kapsamındadır.</footer>
</body></html>`;
}
