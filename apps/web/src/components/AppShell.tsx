'use client';

import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { ScanWorkspace } from './workspace/ScanWorkspace';
import { ToolsClient } from './tools/ToolsClient';

type Tab = 'scan' | 'tools';
const GITHUB = 'https://github.com/iamcanturk/janus';

export function AppShell({ initial = 'scan' }: { initial?: Tab }) {
  const [tab, setTab] = useState<Tab>(initial);

  const tabBtn = (id: Tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        tab === id ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <button
            onClick={() => setTab('scan')}
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-100"
          >
            <span aria-hidden>🜏</span> Janus
          </button>
          <nav className="ml-2 flex items-center gap-1">
            {tabBtn('scan', 'Tarama')}
            {tabBtn('tools', 'El Çantası')}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <a
              href={GITHUB}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-2.5 py-1.5 text-sm text-slate-400 hover:text-slate-200"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'scan' ? (
          <>
            <div className="mb-5">
              <h1 className="text-xl font-semibold text-slate-100">Saldırı yüzeyi keşfi</h1>
              <p className="text-sm text-slate-400">
                Bir hedef gir, modülleri tek tek ya da profil olarak çalıştır; grafik büyüsün,
                sonuçlar kaydedilsin.
              </p>
            </div>
            <ScanWorkspace />
          </>
        ) : (
          <>
            <div className="mb-5">
              <h1 className="text-xl font-semibold text-slate-100">El Çantası</h1>
              <p className="text-sm text-slate-400">
                Keysiz, lokal yardımcı araçlar — hepsi tarayıcında çalışır, veri sunucuya gitmez.
              </p>
            </div>
            <ToolsClient />
          </>
        )}

        <footer className="mt-10 border-t border-slate-800 pt-4 text-xs text-slate-500">
          ⚖️ Yalnızca{' '}
          <strong className="text-slate-400">
            sahibi olduğun ya da test etmeye yetkili olduğun
          </strong>{' '}
          varlıklarda kullan. Pasif modüller hedefe tek paket bile göndermez; aktif modüller kırmızı
          onay arkasındadır. Kişisel veriler KVKK/GDPR kapsamındadır.
        </footer>
      </main>
    </div>
  );
}
