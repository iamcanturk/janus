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

import { runScan } from '@janus/core';
import type { CheckRunStatus, EntityType } from '@janus/core';
import { createRegistry } from '@janus/checks';

const ICON: Record<CheckRunStatus, string> = {
  clean: '✅',
  observation: '⚠️ ',
  finding: '❌',
  skipped: '⏭️ ',
  error: '💥',
};

function parseArgs(argv: string[]): { value: string; profile: string; type: EntityType } {
  const positional = argv.filter((a) => !a.startsWith('--'));
  const typeFlag = argv.indexOf('--type');
  return {
    value: positional[0] ?? '',
    profile: positional[1] ?? 'pasif-recon',
    type: (typeFlag >= 0 ? argv[typeFlag + 1] : 'domain') as EntityType,
  };
}

async function main(): Promise<void> {
  const { value, profile, type } = parseArgs(process.argv.slice(2));
  if (!value) {
    console.error('Usage: scan <target> [profile] [--type domain|ip]');
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
  console.log('');
}

void main();
