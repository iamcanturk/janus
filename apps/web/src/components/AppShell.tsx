'use client';

import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { ScanWorkspace } from './workspace/ScanWorkspace';
import { ToolsClient } from './tools/ToolsClient';
import { toolsByCategory, type ToolId } from './tools/registry';

type Tab = 'scan' | 'tools';
const GITHUB = 'https://github.com/iamcanturk/janus';

export function AppShell({ initial = 'scan' }: { initial?: Tab }) {
  const [tab, setTab] = useState<Tab>(initial);
  const [toolId, setToolId] = useState<ToolId>('base64');
  const [menuOpen, setMenuOpen] = useState(false);

  const openTool = (id: ToolId) => {
    setToolId(id);
    setTab('tools');
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-2.5">
          <button
            onClick={() => setTab('scan')}
            className="mr-2 flex items-center gap-2 text-lg font-bold tracking-tight text-slate-100"
          >
            <span aria-hidden>🜏</span> Janus
          </button>

          <button
            onClick={() => setTab('scan')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === 'scan' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tarama
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === 'tools'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              El Çantası <span className="text-xs">▾</span>
            </button>
            {menuOpen && (
              <>
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Menüyü kapat"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 grid w-[520px] grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-xl">
                  {toolsByCategory().map(([cat, tools]) => (
                    <div key={cat}>
                      <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {cat}
                      </div>
                      {tools.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => openTool(t.id)}
                          className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

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
                Bir hedef gir, modülleri tek tek ya da profil olarak çalıştır; hedef panosu dolsun,
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
            <ToolsClient active={toolId} onActive={setToolId} />
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
