'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { BUILTIN_PROFILES } from '@janus/core';
import type { EntityType } from '@janus/core';
import type { ScanRequest } from '@/lib/types';

interface Props {
  disabled: boolean;
  onScan: (req: ScanRequest) => void;
}

export function ScanForm({ disabled, onScan }: Props) {
  const [value, setValue] = useState('');
  const [type, setType] = useState<EntityType>('domain');
  const [profileId, setProfileId] = useState('pasif-recon');

  const profile = BUILTIN_PROFILES.find((p) => p.id === profileId);
  const isActive = profile?.allowActive ?? false;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    if (isActive) {
      const ok = window.confirm(
        'Bu profil hedefe CANLI paket gönderen aktif modülleri çalıştırır.\n\n' +
          'Yalnızca sahibi olduğun ya da test etmeye YETKİLİ olduğun varlıklarda kullan.\n\nDevam edilsin mi?',
      );
      if (!ok) return;
    }
    onScan({ value: trimmed, type, profileId });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as EntityType)}
          disabled={disabled}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 disabled:opacity-50"
          aria-label="Hedef tipi"
        >
          <option value="domain">domain</option>
          <option value="ip">ip</option>
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder={type === 'ip' ? '203.0.113.10' : 'example.com'}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500 disabled:opacity-50"
          aria-label="Hedef"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {BUILTIN_PROFILES.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => setProfileId(p.id)}
            disabled={disabled}
            className={`rounded-lg border px-3 py-2.5 text-left transition disabled:opacity-50 ${
              p.id === profileId
                ? 'border-cyan-500 bg-cyan-950/40'
                : 'border-slate-700 bg-slate-900 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-100">
              {p.title}
              {p.allowActive && (
                <span className="rounded bg-rose-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                  AKTİF
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-400">{p.description}</div>
          </button>
        ))}
      </div>

      {isActive && (
        <p className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
          ⚠️ Bu profil hedefe canlı paket gönderir. Yalnızca yetkili olduğun varlıklarda çalıştır.
        </p>
      )}

      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {disabled ? 'Taranıyor…' : 'Taramayı başlat'}
      </button>
    </form>
  );
}
