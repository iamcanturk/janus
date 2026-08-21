'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Finding } from '@janus/core';
import { renderHtml, renderReport } from '@janus/report';
import type { ReportInput } from '@janus/report';
import { streamScan } from '@/lib/client';
import { detectType } from '@/lib/detect';
import type {
  CatalogResponse,
  CheckMeta,
  GraphNode,
  ProfileMeta,
  ScanRequest,
  ScanSummary,
  TaskEvent,
} from '@/lib/types';
import { TargetBar } from './TargetBar';
import { ModuleCatalog, type CheckState } from './ModuleCatalog';
import { Dashboard } from '../dashboard/Dashboard';
import { HistoryList } from './HistoryList';
import type { CheckRunStatus } from '@janus/core';

interface Accumulator {
  nodes: Map<string, GraphNode>;
  edges: Map<string, { from: string; to: string; relation: string }>;
  findings: Map<string, Finding>;
  tasks: TaskEvent[];
  checkState: Record<string, CheckState>;
}

const emptyAcc = (): Accumulator => ({
  nodes: new Map(),
  edges: new Map(),
  findings: new Map(),
  tasks: [],
  checkState: {},
});

const RANK: Record<CheckRunStatus, number> = {
  finding: 5,
  error: 4,
  observation: 3,
  clean: 2,
  skipped: 1,
};

function mergeStatus(prev: CheckState, next: CheckRunStatus): CheckRunStatus {
  if (!prev || prev === 'running') return next;
  return RANK[next] >= RANK[prev] ? next : prev;
}

export function ScanWorkspace() {
  const [value, setValue] = useState('');
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [history, setHistory] = useState<{ available: boolean; scans: ScanSummary[] }>({
    available: false,
    scans: [],
  });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [profileLabel, setProfileLabel] = useState('pasif-recon');
  const [, force] = useState(0);
  const acc = useRef<Accumulator>(emptyAcc());

  const rerender = () => force((n) => n + 1);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/scans');
      const json = (await res.json()) as { available: boolean; scans: ScanSummary[] };
      setHistory(json);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch('/api/checks')
      .then((r) => r.json() as Promise<CatalogResponse>)
      .then(setCatalog)
      .catch(() => setCatalog({ checks: [], profiles: [] }));
    void refreshHistory();
  }, [refreshHistory]);

  const resetResults = useCallback(() => {
    acc.current = emptyAcc();
    setActiveHistoryId(null);
    setError(null);
    rerender();
  }, []);

  const onChangeTarget = useCallback(
    (v: string) => {
      setValue(v);
      if (acc.current.tasks.length > 0) resetResults();
    },
    [resetResults],
  );

  const run = useCallback(
    async (req: Omit<ScanRequest, 'seeds' | 'value' | 'type'>, runningIds: readonly string[]) => {
      const target = value.trim();
      if (!target || detectType(target) === 'unknown' || running) return;

      for (const id of runningIds) acc.current.checkState[id] = 'running';
      setError(null);
      setRunning(true);
      rerender();

      const seeds = [...acc.current.nodes.values()];
      try {
        await streamScan(
          { value: target, ...req, seeds },
          {
            onTask: (task) => {
              acc.current.checkState[task.checkId] = mergeStatus(
                acc.current.checkState[task.checkId],
                task.status,
              );
              acc.current.tasks.push(task);
              // Merge what this task produced so the dashboard fills live.
              for (const n of task.entities) acc.current.nodes.set(n.id, n);
              for (const e of task.edges)
                acc.current.edges.set(`${e.from}|${e.relation}|${e.to}`, e);
              for (const f of task.newFindings)
                acc.current.findings.set(`${f.code}|${f.entity?.value ?? ''}`, f);
              rerender();
            },
            onDone: (done) => {
              for (const n of done.graph.nodes) acc.current.nodes.set(n.id, n);
              for (const e of done.graph.edges)
                acc.current.edges.set(`${e.from}|${e.relation}|${e.to}`, e);
              for (const f of done.findings)
                acc.current.findings.set(`${f.code}|${f.entity?.value ?? ''}`, f);
              if (done.savedId) void refreshHistory();
              rerender();
            },
            onError: (e) => setError(e.message),
          },
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setRunning(false);
        rerender();
      }
    },
    [value, running, refreshHistory],
  );

  const confirmActive = () =>
    window.confirm(
      'Bu, hedefe CANLI paket gönderen aktif bir modül çalıştırır.\n\n' +
        'Yalnızca sahibi olduğun ya da test etmeye YETKİLİ olduğun varlıklarda kullan.\n\nDevam edilsin mi?',
    );

  const onRunProfile = useCallback(
    (p: ProfileMeta) => {
      if (p.allowActive && !confirmActive()) return;
      setProfileLabel(p.id);
      void run({ profileId: p.id }, p.checkIds);
    },
    [run],
  );

  const onRunCheck = useCallback(
    (c: CheckMeta) => {
      if (c.mode === 'active' && !confirmActive()) return;
      setProfileLabel('özel');
      void run({ checkIds: [c.id] }, [c.id]);
    },
    [run],
  );

  const onRunPhase = useCallback(
    (checkIds: string[]) => {
      const active = (catalog?.checks ?? []).some(
        (c) => checkIds.includes(c.id) && c.mode === 'active',
      );
      if (active && !confirmActive()) return;
      setProfileLabel('özel');
      void run({ checkIds }, checkIds);
    },
    [run, catalog],
  );

  const onPivot = useCallback(
    (_type: string, val: string) => {
      setValue(val);
      resetResults();
      // give React a tick so `value` is updated before the run reads it
      setTimeout(() => void run({ profileId: 'pasif-recon' }, []), 0);
    },
    [run, resetResults],
  );

  const reopen = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/scans/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const next = emptyAcc();
      for (const n of data.graph.nodes) next.nodes.set(n.id, n);
      for (const e of data.graph.edges) next.edges.set(`${e.from}|${e.relation}|${e.to}`, e);
      for (const f of data.findings) next.findings.set(`${f.code}|${f.entity?.value ?? ''}`, f);
      next.tasks = data.tasks;
      for (const t of data.tasks as TaskEvent[])
        next.checkState[t.checkId] = mergeStatus(next.checkState[t.checkId], t.status);
      acc.current = next;
      setValue(data.target.value);
      setProfileLabel(data.profileId);
      setActiveHistoryId(id);
      rerender();
    } catch {
      /* ignore */
    }
  }, []);

  const rescan = useCallback(
    (scan: ScanSummary) => {
      setValue(scan.targetValue);
      resetResults();
      const profileId = catalog?.profiles.some((p) => p.id === scan.profileId)
        ? scan.profileId
        : 'pasif-recon';
      setTimeout(() => void run({ profileId }, []), 0);
    },
    [run, resetResults, catalog],
  );

  // Derived view data from the accumulator.
  const nodes = [...acc.current.nodes.values()];
  const edges = [...acc.current.edges.values()];
  const findings = [...acc.current.findings.values()];
  const tasks = acc.current.tasks;
  const entityTypes: Record<string, number> = {};
  for (const n of nodes) entityTypes[n.type] = (entityTypes[n.type] ?? 0) + 1;
  const counts = {
    tasks: tasks.length,
    entities: nodes.length,
    edges: edges.length,
    observations: tasks.reduce((s, t) => s + t.observations, 0),
    findings: findings.length,
  };
  const hasRun = tasks.length > 0;

  // Plain closures (not memoized) so they always read the freshest results.
  const buildInput = (): ReportInput | null => {
    if (!hasRun) return null;
    const type = detectType(value) === 'ip' ? 'ip' : 'domain';
    return {
      target: { type, value: value.trim() },
      profileId: profileLabel,
      generatedAt: new Date().toISOString(),
      counts,
      entityTypes,
      findings,
      tasks: tasks.map((t) => ({
        checkId: t.checkId,
        status: t.status,
        target: t.target,
        durationMs: t.durationMs,
        skippedReason: t.skippedReason,
      })),
    };
  };

  const downloadReport = async () => {
    const input = buildInput();
    if (!input) return;
    const { markdown } = await renderReport(input);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `janus-${input.target.value}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const input = buildInput();
    if (!input) return;
    const blob = new Blob([renderHtml(input)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) win.addEventListener('load', () => win.print());
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="space-y-4">
      <TargetBar
        value={value}
        onChange={onChangeTarget}
        onSubmit={() =>
          onRunProfile(
            catalog?.profiles.find((p) => p.id === 'pasif-recon') ?? {
              id: 'pasif-recon',
              title: 'Pasif',
              description: '',
              allowActive: false,
              checkIds: [],
            },
          )
        }
        running={running}
      />

      {error && (
        <p className="rounded-lg border border-fuchsia-800 bg-fuchsia-950/40 px-3 py-2 text-sm text-fuchsia-300">
          💥 {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-4">
          {catalog && (
            <ModuleCatalog
              checks={catalog.checks}
              profiles={catalog.profiles}
              state={acc.current.checkState}
              disabled={running || detectType(value) === 'unknown'}
              onRunProfile={onRunProfile}
              onRunPhase={onRunPhase}
              onRunCheck={onRunCheck}
            />
          )}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Geçmiş
            </h3>
            <HistoryList
              scans={history.scans}
              available={history.available}
              activeId={activeHistoryId}
              onReopen={reopen}
              onRescan={rescan}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Dashboard
            target={{ type: detectType(value) === 'ip' ? 'ip' : 'domain', value: value.trim() }}
            counts={counts}
            findings={findings}
            nodes={nodes}
            graph={{ nodes, edges, truncated: 0 }}
            running={running}
            hasRun={hasRun}
            onPivot={onPivot}
          />
          {hasRun && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={downloadReport}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:border-cyan-500"
              >
                📄 Markdown (SHA-256 imzalı)
              </button>
              <button
                onClick={printReport}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:border-cyan-500"
              >
                🖨️ PDF (yazdır)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
