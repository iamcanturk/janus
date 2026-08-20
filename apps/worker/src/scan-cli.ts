/**
 * Standalone scan CLI — runs a scan directly (no queue, no DB) and prints a
 * live checklist. Handy for trying passive modules end to end:
 *
 *   pnpm --filter @janus/worker scan example.com
 *   pnpm --filter @janus/worker scan 1.1.1.1 pasif-recon --type ip
 *
 * This makes real network requests via the passive modules. Only scan assets
 * you own or are authorized to test.
 */

import { writeFile } from 'node:fs/promises';
import { runScan } from '@janus/core';
import type { CheckRunStatus, EntityType } from '@janus/core';
import { createRegistry } from '@janus/checks';
import { renderReport } from '@janus/report';
import type { ReportInput } from '@janus/report';

const ICON: Record<CheckRunStatus, string> = {
  clean: '✅',
  observation: '⚠️ ',
  finding: '❌',
  skipped: '⏭️ ',
  error: '💥',
};

function parseArgs(argv: string[]): {
  value: string;
  profile: string;
  type: EntityType;
  report?: string;
} {
  const flags = new Set(['--type', '--report']);
  const positional = argv.filter((a, i) => !a.startsWith('--') && !flags.has(argv[i - 1] ?? ''));
  const typeFlag = argv.indexOf('--type');
  const reportFlag = argv.indexOf('--report');
  let report: string | undefined;
  if (reportFlag >= 0) {
    const next = argv[reportFlag + 1];
    report = next && !next.startsWith('--') ? next : 'janus-report.md';
  }
  return {
    value: positional[0] ?? '',
    profile: positional[1] ?? 'pasif-recon',
    type: (typeFlag >= 0 ? argv[typeFlag + 1] : 'domain') as EntityType,
    report,
  };
}

async function main(): Promise<void> {
  const { value, profile, type, report: reportPath } = parseArgs(process.argv.slice(2));
  if (!value) {
    console.error('Usage: scan <target> [profile] [--type domain|ip] [--report [file]]');
    process.exit(1);
  }

  console.log(`\n🎯 Hedef: ${type}:${value}   Profil: ${profile}\n`);
  const registry = createRegistry();

  const report = await runScan(
    registry,
    profile,
    { type, value },
    {
      onTask: (task) => {
        const icon = ICON[task.status];
        const detail = task.skippedReason ?? task.error ?? '';
        console.log(
          `  ${icon} ${task.checkId.padEnd(22)} ${task.targetEntity.type}:${task.targetEntity.value} ${detail}`,
        );
      },
    },
  );

  const c = report.counts;
  console.log(
    `\n📊 ${c.tasks} kontrol · ${c.entities} varlık · ${c.edges} bağlantı · ` +
      `${c.observations} gözlem · ${c.findings} bulgu`,
  );

  if (report.findings.length > 0) {
    console.log('\nBulgular:');
    for (const f of report.findings) {
      console.log(`  ❌ [${f.severity}] ${f.title} — ${f.entity?.value ?? ''}`);
    }
  }

  if (reportPath) {
    const entityTypes: Record<string, number> = {};
    for (const e of report.entities) entityTypes[e.type] = (entityTypes[e.type] ?? 0) + 1;
    const input: ReportInput = {
      target: { type: String(type), value },
      profileId: report.profileId,
      generatedAt: new Date().toISOString(),
      counts: report.counts,
      entityTypes,
      findings: report.findings,
      tasks: report.tasks.map((t) => ({
        checkId: t.checkId,
        status: t.status,
        target: { type: t.targetEntity.type, value: t.targetEntity.value },
        durationMs: t.durationMs,
        skippedReason: t.skippedReason,
      })),
    };
    const rendered = await renderReport(input);
    await writeFile(reportPath, rendered.markdown, 'utf8');
    console.log(`\n📄 Rapor yazıldı: ${reportPath}  (SHA-256: ${rendered.sha256.slice(0, 16)}…)`);
  }
  console.log('');
}

void main();
