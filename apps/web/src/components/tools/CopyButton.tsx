'use client';

import { useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400 hover:border-cyan-500 hover:text-cyan-300"
    >
      {copied ? 'kopyalandı ✓' : 'kopyala'}
    </button>
  );
}
