'use client';

import type { ScanSummary } from '@/lib/types';

interface Props {
  scans: readonly ScanSummary[];
  available: boolean;
  activeId: string | null;
  onReopen: (id: string) => void;
  onRescan: (scan: ScanSummary) => void;
}

export function HistoryList({ scans, available, activeId, onReopen, onRescan }: Props) {
  if (!available) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 px-3 py-3 text-xs text-slate-500">
        💾 Kayıtlı taramalar için PostgreSQL gerekir.
        <br />
        <code className="text-slate-400">docker compose up -d</code> + migration çalıştır, sonra
        taramalar burada saklanır.
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-800 px-3 py-3 text-xs text-slate-500">
        Henüz kayıtlı tarama yok. Bir tarama çalıştır — otomatik saklanır.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {scans.map((s) => (
        <li
          key={s.id}
          className={`rounded-lg border px-3 py-2 ${
            s.id === activeId
              ? 'border-cyan-600 bg-cyan-950/30'
              : 'border-slate-800 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => onReopen(s.id)} className="min-w-0 flex-1 text-left">
              <span className="block truncate font-mono text-sm text-slate-200">
                {s.targetType}:{s.targetValue}
              </span>
              <span className="text-[11px] text-slate-500">
                {new Date(s.createdAt).toLocaleString('tr-TR')} · {s.entities} varlık · {s.findings}{' '}
                bulgu
              </span>
            </button>
            <button
              onClick={() => onRescan(s)}
              className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:border-cyan-500 hover:text-cyan-300"
              title="Yeniden tara"
            >
              ↻
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
