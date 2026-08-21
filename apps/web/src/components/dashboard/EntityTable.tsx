'use client';

import { useMemo, useState } from 'react';

export interface Row {
  value: string;
  meta?: string;
  pivot?: { type: string; value: string };
}

interface Props {
  columns: [string, string?];
  rows: readonly Row[];
  onPivot?: (type: string, value: string) => void;
  emptyLabel?: string;
}

export function EntityTable({ columns, rows, onPivot, emptyLabel }: Props) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) => r.value.toLowerCase().includes(s) || r.meta?.toLowerCase().includes(s),
    );
  }, [rows, q]);

  if (rows.length === 0)
    return (
      <p className="px-1 py-6 text-center text-sm text-slate-500">{emptyLabel ?? 'Kayıt yok.'}</p>
    );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">
          {filtered.length}/{rows.length} kayıt
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ara…"
          className="w-48 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500"
        />
      </div>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-800">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-900 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">{columns[0]}</th>
              {columns[1] && <th className="w-32 px-3 py-2 font-medium">{columns[1]}</th>}
              {onPivot && <th className="w-24 px-3 py-2 font-medium"></th>}
            </tr>
          </thead>
          <tbody className="font-mono text-[13px]">
            {filtered.map((r, i) => (
              <tr
                key={`${r.value}-${i}`}
                className="border-t border-slate-800/70 hover:bg-slate-900/50"
              >
                <td className="truncate px-3 py-1.5 text-slate-200" title={r.value}>
                  {r.value}
                </td>
                {columns[1] && <td className="truncate px-3 py-1.5 text-slate-500">{r.meta}</td>}
                {onPivot && (
                  <td className="px-3 py-1.5">
                    {r.pivot && (
                      <button
                        onClick={() => onPivot(r.pivot!.type, r.pivot!.value)}
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        pivotla →
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
