'use client';

import { useCallback, useRef, useState } from 'react';
import { renderReport } from '@janus/report';
import type { ReportInput } from '@janus/report';
import { streamScan } from '@/lib/client';
import type { DoneEvent, ScanRequest, TaskEvent } from '@/lib/types';
import { ScanForm } from './ScanForm';
import { Checklist } from './Checklist';
import { GraphView } from './GraphView';

export function ScanClient() {
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [done, setDone] = useState<DoneEvent | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReq, setLastReq] = useState<ScanRequest | null>(null);
  const [view, setView] = useState<'checklist' | 'graph'>('checklist');
  const abortRef = useRef<AbortController | null>(null);

  const onScan = useCallback(async (req: ScanRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setTasks([]);
    setDone(null);
    setError(null);
    setLastReq(req);
    setView('checklist');
    setRunning(true);

    try {
      await streamScan(
        req,
        {
          onTask: (task) => setTasks((prev) => [...prev, task]),
          onDone: (d) => setDone(d),
          onError: (e) => setError(e.message),
        },
        controller.signal,
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setRunning(false);
    }
  }, []);

  const downloadReport = useCallback(async () => {
    if (!done || !lastReq) return;
    const input: ReportInput = {
      target: { type: String(lastReq.type), value: lastReq.value },
      profileId: lastReq.profileId,
      generatedAt: new Date().toISOString(),
      counts: done.counts,
      entityTypes: done.entityTypes,
      findings: done.findings,
      tasks: tasks.map((t) => ({
        checkId: t.checkId,
        status: t.status,
        target: t.target,
        durationMs: t.durationMs,
        skippedReason: t.skippedReason,
      })),
    };
    const { markdown } = await renderReport(input);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `janus-${lastReq.value}-${lastReq.profileId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [done, lastReq, tasks]);

  const onPivot = useCallback(
    (type: string, value: string) => {
      void onScan({ type, value, profileId: lastReq?.profileId ?? 'pasif-recon' });
    },
    [onScan, lastReq],
  );

  const showResults = done && !running;

  return (
    <div className="space-y-6">
      <ScanForm disabled={running} onScan={onScan} />

      {showResults && done.graph.nodes.length > 0 && (
        <div className="flex gap-2">
          {(['checklist', 'graph'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                view === v
                  ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              {v === 'checklist' ? 'Kontrol listesi' : 'Grafik'}
            </button>
          ))}
        </div>
      )}

      {view === 'graph' && showResults ? (
        <GraphView graph={done.graph} onPivot={onPivot} />
      ) : (
        <Checklist tasks={tasks} done={done} running={running} error={error} />
      )}

      {showResults && (
        <button
          onClick={downloadReport}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-500"
        >
          📄 Rapor indir (Markdown · SHA-256 imzalı)
        </button>
      )}
    </div>
  );
}
