'use client';

import { useCallback, useRef, useState } from 'react';
import { streamScan } from '@/lib/client';
import type { DoneEvent, ScanRequest, TaskEvent } from '@/lib/types';
import { ScanForm } from './ScanForm';
import { Checklist } from './Checklist';

export function ScanClient() {
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [done, setDone] = useState<DoneEvent | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const onScan = useCallback(async (req: ScanRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setTasks([]);
    setDone(null);
    setError(null);
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

  return (
    <div className="space-y-6">
      <ScanForm disabled={running} onScan={onScan} />
      <Checklist tasks={tasks} done={done} running={running} error={error} />
    </div>
  );
}
