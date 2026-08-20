import type { CheckRunStatus } from '@janus/core';

export const STATUS_META: Record<
  CheckRunStatus,
  { icon: string; label: string; className: string }
> = {
  clean: { icon: '✅', label: 'temiz', className: 'text-emerald-400' },
  observation: { icon: '⚠️', label: 'gözlem', className: 'text-amber-400' },
  finding: { icon: '❌', label: 'bulgu', className: 'text-rose-400' },
  skipped: { icon: '⏭️', label: 'atlandı', className: 'text-slate-500' },
  error: { icon: '💥', label: 'hata', className: 'text-fuchsia-400' },
};

export const SEVERITY_CLASS: Record<string, string> = {
  info: 'bg-slate-700 text-slate-200',
  low: 'bg-amber-900/60 text-amber-300',
  medium: 'bg-orange-900/60 text-orange-300',
  high: 'bg-rose-900/60 text-rose-300',
  critical: 'bg-red-800 text-red-100',
};
