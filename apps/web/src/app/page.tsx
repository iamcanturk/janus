import { Nav } from '@/components/Nav';
import { ScanWorkspace } from '@/components/workspace/ScanWorkspace';

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <Nav active="scan" />

      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-100">Saldırı yüzeyi keşfi</h1>
        <p className="text-sm text-slate-400">
          Bir hedef gir, modülleri tek tek ya da profil olarak çalıştır; grafik büyüsün, sonuçlar
          kaydedilsin.
        </p>
      </div>

      <ScanWorkspace />

      <footer className="mt-10 border-t border-slate-800 pt-4 text-xs text-slate-500">
        ⚖️ Yalnızca{' '}
        <strong className="text-slate-400">sahibi olduğun ya da test etmeye yetkili olduğun</strong>{' '}
        varlıklarda kullan. Pasif modüller hedefe tek paket bile göndermez; aktif modüller kırmızı
        onay arkasındadır. Kişisel veriler KVKK/GDPR kapsamındadır.
      </footer>
    </main>
  );
}
