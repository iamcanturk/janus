'use client';

import { useState } from 'react';
import type { Finding } from '@janus/core';
import type { GraphView, TaskEvent } from '@/lib/types';
import { GraphView as GraphCanvas } from '../GraphView';
import { SEVERITY_CLASS, STATUS_META } from '../statusMeta';

interface Counts {
  tasks: number;
  entities: number;
  edges: number;
  observations: number;
  findings: number;
}

interface Props {
  counts: Counts;
  findings: readonly Finding[];
  graph: GraphView;
  tasks: readonly TaskEvent[];
  running: boolean;
  hasRun: boolean;
  onPivot: (type: string, value: string) => void;
}

type Tab = 'ozet' | 'grafik' | 'checklist';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-2 text-center">
      <div className="text-lg font-semibold tabular-nums text-slate-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export function ResultsPanel({ counts, findings, graph, tasks, running, hasRun, onPivot }: Props) {
  const [tab, setTab] = useState<Tab>('ozet');

  if (!hasRun) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-600">
        Bir modül ya da profil çalıştır — sonuçlar burada birikir.
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ozet', label: 'Özet' },
    { id: 'grafik', label: `Grafik (${graph.nodes.length})` },
    { id: 'checklist', label: `Kontroller (${tasks.length})` },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        <Stat label="kontrol" value={counts.tasks} />
        <Stat label="varlık" value={counts.entities} />
        <Stat label="bağlantı" value={counts.edges} />
        <Stat label="gözlem" value={counts.observations} />
        <Stat label="bulgu" value={counts.findings} />
      </div>

      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-1 text-xs ${
              tab === t.id
                ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                : 'border-slate-700 bg-slate-900 text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
        {running && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" /> çalışıyor
          </span>
        )}
      </div>

      {tab === 'ozet' && (
        <div className="space-y-2">
          {findings.length === 0 ? (
            <p className="rounded-lg border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-400">
              ✅ Şimdiye kadar bulgu yok.
            </p>
          ) : (
            <ul className="space-y-2">
              {findings.map((f, i) => (
                <li
                  key={`${f.code}-${i}`}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
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
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{f.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'grafik' &&
        (graph.nodes.length > 0 ? (
          <GraphCanvas graph={graph} onPivot={onPivot} />
        ) : (
          <p className="rounded-lg border border-slate-800 px-3 py-6 text-center text-sm text-slate-600">
            Grafik için henüz varlık yok.
          </p>
        ))}

      {tab === 'checklist' && (
        <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
          {tasks.map((t, i) => {
            const meta = STATUS_META[t.status];
            return (
              <li
                key={`${t.checkId}-${t.target.value}-${i}`}
                className="flex items-center gap-3 bg-slate-900/40 px-3 py-1.5 text-sm"
              >
                <span className={meta.className}>{meta.icon}</span>
                <span className="font-mono text-slate-200">{t.checkId}</span>
                <span className="truncate font-mono text-xs text-slate-500">
                  {t.target.type}:{t.target.value}
                </span>
                <span className="ml-auto shrink-0 text-xs text-slate-500">
                  {t.skippedReason ? 'atlandı' : `${t.durationMs}ms`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
