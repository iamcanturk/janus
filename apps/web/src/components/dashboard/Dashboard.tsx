'use client';

import { useMemo, useState } from 'react';
import type { Finding } from '@janus/core';
import type { GraphNode, GraphView } from '@/lib/types';
import { GraphView as GraphCanvas } from '../GraphView';
import { EntityTable, type Row } from './EntityTable';
import { FindingsView } from './FindingsView';

interface Counts {
  tasks: number;
  entities: number;
  edges: number;
  observations: number;
  findings: number;
}

interface Props {
  target: { type: string; value: string };
  counts: Counts;
  findings: readonly Finding[];
  nodes: readonly GraphNode[];
  graph: GraphView;
  running: boolean;
  hasRun: boolean;
  onPivot: (type: string, value: string) => void;
}

const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;
const RISK: Record<string, { label: string; cls: string }> = {
  critical: { label: 'kritik risk', cls: 'bg-red-900/60 text-red-300' },
  high: { label: 'yüksek risk', cls: 'bg-rose-900/60 text-rose-300' },
  medium: { label: 'orta risk', cls: 'bg-amber-900/60 text-amber-300' },
  low: { label: 'düşük risk', cls: 'bg-sky-900/60 text-sky-300' },
  info: { label: 'bilgi', cls: 'bg-slate-800 text-slate-300' },
  clean: { label: 'temiz', cls: 'bg-emerald-900/60 text-emerald-300' },
};

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-900/60 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold tabular-nums text-slate-100">{value}</div>
    </div>
  );
}

type Tab = 'ozet' | 'bulgular' | 'subdomain' | 'ipport' | 'diger' | 'grafik';

export function Dashboard({
  target,
  counts,
  findings,
  nodes,
  graph,
  running,
  hasRun,
  onPivot,
}: Props) {
  const [tab, setTab] = useState<Tab>('ozet');

  const groups = useMemo(() => {
    const g: Record<string, GraphNode[]> = {};
    for (const n of nodes) (g[n.type] ??= []).push(n);
    return g;
  }, [nodes]);

  if (!hasRun) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-800 text-center">
        <span className="text-3xl" aria-hidden>
          🎯
        </span>
        <p className="text-sm text-slate-500">Bir hedef gir ve tara.</p>
        <p className="text-xs text-slate-600">Sonuçlar burada bir hedef panosu olarak toplanır.</p>
      </div>
    );
  }

  const worst = SEV_ORDER.find((s) => findings.some((f) => f.severity === s));
  const risk = RISK[worst ?? 'clean'];

  const subdomains = groups['subdomain'] ?? [];
  const ips = groups['ip'] ?? [];
  const ports = groups['port'] ?? [];
  const others = nodes.filter((n) => !['subdomain', 'ip', 'port', 'domain'].includes(n.type));

  const cveCount = (groups['cve'] ?? []).length;
  const techCount = (groups['technology'] ?? []).length;

  const rows = (list: GraphNode[], pivotable = false): Row[] =>
    list.map((n) => ({
      value: n.value,
      pivot: pivotable ? { type: n.type, value: n.value } : undefined,
    }));

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'ozet', label: 'Genel bakış', show: true },
    { id: 'bulgular', label: `Bulgular (${findings.length})`, show: true },
    { id: 'subdomain', label: `Subdomainler (${subdomains.length})`, show: subdomains.length > 0 },
    {
      id: 'ipport',
      label: `IP & Port (${ips.length + ports.length})`,
      show: ips.length + ports.length > 0,
    },
    { id: 'diger', label: `Diğer (${others.length})`, show: others.length > 0 },
    { id: 'grafik', label: 'Grafik', show: nodes.length > 0 },
  ];
  const activeTab = tabs.find((t) => t.id === tab)?.show ? tab : 'ozet';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500">🎯</span>
          <span className="text-lg font-semibold text-slate-100">{target.value}</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
            {target.type}
          </span>
          <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${risk.cls}`}>
            {risk.label}
          </span>
          {running && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" /> taranıyor
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <Metric label="subdomain" value={subdomains.length} />
          <Metric label="IP" value={ips.length} />
          <Metric label="açık port" value={ports.length} />
          <Metric label="teknoloji" value={techCount} />
          <Metric label="CVE" value={cveCount} />
          <Metric label="bulgu" value={counts.findings} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-800">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-sm ${
                activeTab === t.id
                  ? 'border-cyan-500 text-slate-100'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {activeTab === 'ozet' && (
        <div className="space-y-4">
          <FindingsView findings={findings.slice(0, 5)} />
          {findings.length > 5 && (
            <button
              onClick={() => setTab('bulgular')}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              tüm {findings.length} bulguyu gör →
            </button>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(groups)
              .sort((a, b) => b[1].length - a[1].length)
              .map(([type, list]) => (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-sm"
                >
                  <span className="text-slate-400">{type}</span>
                  <span className="font-mono text-slate-200">{list.length}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'bulgular' && <FindingsView findings={findings} />}

      {activeTab === 'subdomain' && (
        <EntityTable
          columns={['host']}
          rows={rows(subdomains, true)}
          onPivot={onPivot}
          emptyLabel="Subdomain bulunamadı."
        />
      )}

      {activeTab === 'ipport' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              IP
            </h4>
            <EntityTable columns={['adres']} rows={rows(ips, true)} onPivot={onPivot} />
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Açık portlar
            </h4>
            <EntityTable columns={['ip:port']} rows={rows(ports)} />
          </div>
        </div>
      )}

      {activeTab === 'diger' && (
        <EntityTable
          columns={['varlık', 'tip']}
          rows={others.map((n) => ({ value: n.value, meta: n.type }))}
        />
      )}

      {activeTab === 'grafik' &&
        (nodes.length > 0 ? (
          <GraphCanvas graph={graph} onPivot={onPivot} />
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">Grafik için varlık yok.</p>
        ))}
    </div>
  );
}
