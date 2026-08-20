'use client';

import type { DoneEvent, TaskEvent } from '@/lib/types';
import { SEVERITY_CLASS, STATUS_META } from './statusMeta';

interface Props {
  tasks: TaskEvent[];
  done: DoneEvent | null;
  running: boolean;
  error: string | null;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-center">
      <div className="text-lg font-semibold text-slate-100 tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export function Checklist({ tasks, done, running, error }: Props) {
  if (tasks.length === 0 && !running && !error) return null;

  const counts = done?.counts;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="kontrol" value={counts?.tasks ?? tasks.length} />
        <Stat label="varlık" value={counts?.entities ?? 0} />
        <Stat label="bağlantı" value={counts?.edges ?? 0} />
        <Stat
          label="gözlem"
          value={counts?.observations ?? tasks.reduce((n, t) => n + t.observations, 0)}
        />
        <Stat label="bulgu" value={counts?.findings ?? tasks.reduce((n, t) => n + t.findings, 0)} />
      </div>

      {error && (
        <p className="rounded-lg border border-fuchsia-800 bg-fuchsia-950/40 px-3 py-2 text-sm text-fuchsia-300">
          💥 {error}
        </p>
      )}

      <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
        {tasks.map((t, i) => {
          const meta = STATUS_META[t.status];
          return (
            <li
              key={`${t.checkId}-${t.target.value}-${i}`}
              className="flex items-center gap-3 bg-slate-900/40 px-3 py-2 text-sm"
            >
              <span className={meta.className}>{meta.icon}</span>
              <span className="font-mono text-slate-200">{t.checkId}</span>
              <span className="truncate font-mono text-xs text-slate-500">
                {t.target.type}:{t.target.value}
              </span>
              <span className="ml-auto shrink-0 text-xs text-slate-500">
                {t.skippedReason ? 'kapsam dışı' : `${t.durationMs}ms`}
              </span>
            </li>
          );
        })}
        {running && (
          <li className="flex items-center gap-3 bg-slate-900/40 px-3 py-2 text-sm text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
            devam ediyor…
          </li>
        )}
      </ul>

      {done && done.findings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300">Bulgular</h3>
          <ul className="space-y-2">
            {done.findings.map((f, i) => (
              <li
                key={`${f.code}-${i}`}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_CLASS[f.severity] ?? ''}`}
                  >
                    {f.severity}
                  </span>
                  <span className="text-sm font-medium text-slate-100">{f.title}</span>
                  {f.entity && (
                    <span className="font-mono text-xs text-slate-500">{f.entity.value}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">{f.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {done && done.findings.length === 0 && !running && (
        <p className="rounded-lg border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-400">
          ✅ Tarama tamamlandı — bulgu yok.
        </p>
      )}
    </div>
  );
}
