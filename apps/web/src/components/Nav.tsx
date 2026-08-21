import Link from 'next/link';

const GITHUB = 'https://github.com/iamcanturk/janus';

export function Nav({ active }: { active: 'scan' | 'tools' }) {
  const tab = (href: string, label: string, id: 'scan' | 'tools') => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        active === id ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="mb-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="text-2xl" aria-hidden>
          🜏
        </span>
        <span className="text-lg font-bold tracking-tight text-slate-100">Janus</span>
      </Link>
      <nav className="flex items-center gap-1">
        {tab('/', 'Tarama', 'scan')}
        {tab('/araclar', 'El Çantası', 'tools')}
        <a
          href={GITHUB}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          GitHub ↗
        </a>
      </nav>
    </header>
  );
}
