import { ScanClient } from '@/components/ScanClient';

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            🜏
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Janus</h1>
            <p className="text-sm text-slate-400">
              Bir siber güvenlikçinin el çantası — pasif keşif &amp; zafiyet tarama.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
        <ScanClient />
      </section>

      <footer className="mt-8 space-y-2 text-xs text-slate-500">
        <p>
          ⚖️ Yalnızca{' '}
          <strong className="text-slate-400">
            sahibi olduğun ya da test etmeye yetkili olduğun
          </strong>{' '}
          varlıklarda kullan. Kişisel veriler KVKK/GDPR kapsamındadır. Aktif taramadan kullanıcı
          sorumludur.
        </p>
        <p>
          Pasif modüller hedefe <strong className="text-slate-400">tek paket bile göndermez</strong>
          ; yalnızca üçüncü taraf/açık kaynaklardan veri toplar.
        </p>
      </footer>
    </main>
  );
}
