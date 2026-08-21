'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme) {
  const el = document.documentElement;
  el.classList.remove('light', 'dark');
  el.classList.add(theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    setTheme(stored ?? systemTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    apply(next);
    localStorage.setItem('theme', next);
  };

  return (
    <button
      onClick={toggle}
      className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-sm text-slate-400 hover:text-slate-200"
      title={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
      aria-label="Tema değiştir"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
