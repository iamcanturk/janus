import { Nav } from '@/components/Nav';
import { ToolsClient } from '@/components/tools/ToolsClient';

export default function ToolsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <Nav active="tools" />
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-100">El Çantası</h1>
        <p className="text-sm text-slate-400">
          Keysiz, lokal yardımcı araçlar — hepsi tarayıcında çalışır.
        </p>
      </div>
      <ToolsClient />
    </main>
  );
}
