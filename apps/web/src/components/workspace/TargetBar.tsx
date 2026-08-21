'use client';

import { useMemo } from 'react';
import type { FormEvent } from 'react';
import { detectType, normalizeTarget } from '@/lib/detect';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  running: boolean;
}

const BADGE: Record<string, { label: string; cls: string }> = {
  domain: { label: 'domain', cls: 'bg-cyan-900/60 text-cyan-300' },
  ip: { label: 'IP', cls: 'bg-violet-900/60 text-violet-300' },
  unknown: { label: 'geçersiz', cls: 'bg-slate-800 text-slate-500' },
};

export function TargetBar({ value, onChange, onSubmit, running }: Props) {
  const type = useMemo(() => detectType(value), [value]);
  const valid = type !== 'unknown';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid && !running) onSubmit();
  };

  return (
    <form onSubmit={submit} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 focus-within:border-cyan-500">
        <span className="text-slate-500">🎯</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="example.com  ya da  203.0.113.10"
          className="flex-1 bg-transparent font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600"
          autoFocus
          spellCheck={false}
        />
        {value.trim() && (
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${BADGE[type]?.cls}`}>
            {BADGE[type]?.label}
          </span>
        )}
        <button
          type="submit"
          disabled={!valid || running}
          className="rounded-lg bg-cyan-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          {running ? 'Taranıyor…' : 'Pasif tara'}
        </button>
      </div>
      {value.trim() && !valid && (
        <p className="mt-1 px-1 text-xs text-slate-500">
          Geçerli bir domain (example.com) veya IPv4 (203.0.113.10) gir. URL yapıştırırsan otomatik
          ayıklanır ({normalizeTarget(value) || '—'}).
        </p>
      )}
    </form>
  );
}
