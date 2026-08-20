import Link from 'next/link';
import { ToolsClient } from '@/components/ToolsClient';

export default function ToolsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">El Çantası</h1>
          <p className="text-sm text-slate-400">Keysiz, lokal yardımcı araçlar.</p>
        </div>
        <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Tarama
        </Link>
      </header>

      <ToolsClient />
    </main>
  );
}
