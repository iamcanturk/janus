'use client';

import { useState } from 'react';
import type { Finding } from '@janus/core';
import { SEVERITY_CLASS } from '../statusMeta';

const ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

export function FindingsView({ findings }: { findings: readonly Finding[] }) {
  const [filter, setFilter] = useState<string | null>(null);

  if (findings.length === 0)
    return (
      <p className="rounded-lg border border-emerald-900 bg-emerald-950/30 px-3 py-3 text-sm text-emerald-400">
        ✅ Bulgu yok.
      </p>
    );

  const counts: Record<string, number> = {};
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  const shown = filter ? findings.filter((f) => f.severity === filter) : findings;
  const sorted = [...shown].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-md px-2 py-1 text-xs ${!filter ? 'bg-slate-800 text-slate-100' : 'text-slate-400'}`}
        >
          tümü ({findings.length})
        </button>
        {ORDER.filter((s) => counts[s]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-2 py-1 text-xs ${filter === s ? SEVERITY_CLASS[s] : 'text-slate-400'}`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {sorted.map((f, i) => (
          <li
            key={`${f.code}-${i}`}
            className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_CLASS[f.severity] ?? ''}`}
              >
                {f.severity}
              </span>
              <span className="text-sm font-medium text-slate-100">{f.title}</span>
              {f.entity && (
                <span className="font-mono text-xs text-slate-500">{f.entity.value}</span>
              )}
              <span className="ml-auto font-mono text-[11px] text-slate-600">{f.code}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{f.description}</p>
            {f.references && f.references.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {f.references.map((r) => (
                  <a
                    key={r.title}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300"
                  >
                    {r.title} ↗
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
