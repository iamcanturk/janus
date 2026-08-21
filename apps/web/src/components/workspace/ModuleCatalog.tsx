'use client';

import { useMemo } from 'react';
import type { CheckMeta, ProfileMeta } from '@/lib/types';
import type { CheckRunStatus } from '@janus/core';
import { STATUS_META } from '../statusMeta';

const PHASE_ORDER = ['scope', 'recon', 'enumeration', 'surface', 'exposure', 'intel', 'evidence'];
const PHASE_LABEL: Record<string, string> = {
  scope: 'Kapsam',
  recon: 'Keşif',
  enumeration: 'Enumeration',
  surface: 'Yüzey',
  exposure: 'Exposure',
  intel: 'İstihbarat',
  evidence: 'Kanıt',
};

export type CheckState = CheckRunStatus | 'running' | undefined;

interface Props {
  checks: readonly CheckMeta[];
  profiles: readonly ProfileMeta[];
  state: Record<string, CheckState>;
  disabled: boolean;
  onRunProfile: (p: ProfileMeta) => void;
  onRunPhase: (checkIds: string[]) => void;
  onRunCheck: (c: CheckMeta) => void;
}

function StatusDot({ s }: { s: CheckState }) {
  if (s === 'running')
    return <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-cyan-400" />;
  if (!s) return <span className="h-2 w-2 shrink-0 rounded-full bg-slate-700" />;
  return <span className="shrink-0 text-xs">{STATUS_META[s].icon}</span>;
}

export function ModuleCatalog({
  checks,
  profiles,
  state,
  disabled,
  onRunProfile,
  onRunPhase,
  onRunCheck,
}: Props) {
  const byPhase = useMemo(() => {
    const map = new Map<string, CheckMeta[]>();
    for (const c of checks) {
      const list = map.get(c.phase) ?? [];
      list.push(c);
      map.set(c.phase, list);
    }
    return [...map.entries()].sort((a, b) => PHASE_ORDER.indexOf(a[0]) - PHASE_ORDER.indexOf(b[0]));
  }, [checks]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Hazır profiller
        </h3>
        <div className="space-y-1.5">
          {profiles.map((p) => (
            <button
              key={p.id}
              disabled={disabled}
              onClick={() => onRunProfile(p)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition disabled:opacity-50 ${
                p.allowActive
                  ? 'border-rose-800/70 bg-rose-950/20 hover:border-rose-600'
                  : 'border-slate-700 bg-slate-900 hover:border-cyan-600'
              }`}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-100">
                  {p.title}
                  {p.allowActive && (
                    <span className="rounded bg-rose-900/70 px-1 text-[10px] font-semibold text-rose-300">
                      AKTİF
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-slate-500">{p.description}</span>
              </span>
              <span className="ml-2 shrink-0 text-xs text-slate-500">
                {p.checkIds.length} modül
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Modüller — tek tek ya da faz faz çalıştır
        </h3>
        <div className="space-y-3">
          {byPhase.map(([phase, list]) => (
            <div key={phase} className="rounded-lg border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
                <span className="text-xs font-semibold text-slate-300">
                  {PHASE_LABEL[phase] ?? phase}
                </span>
                <button
                  disabled={disabled}
                  onClick={() => onRunPhase(list.map((c) => c.id))}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
                >
                  fazı çalıştır →
                </button>
              </div>
              <ul className="divide-y divide-slate-800/70">
                {list.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 px-3 py-1.5">
                    <StatusDot s={state[c.id]} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm text-slate-200">{c.title}</span>
                        {c.mode === 'active' && (
                          <span className="rounded bg-rose-900/70 px-1 text-[9px] font-semibold text-rose-300">
                            AKTİF{c.risk ? ` · ${c.risk}` : ''}
                          </span>
                        )}
                        {c.needsKey && (
                          <span className="rounded bg-amber-900/60 px-1 text-[9px] font-semibold text-amber-300">
                            KEY
                          </span>
                        )}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-slate-600">
                        {c.id}
                      </span>
                    </span>
                    <button
                      disabled={disabled}
                      onClick={() => onRunCheck(c)}
                      className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-40"
                    >
                      çalıştır
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
