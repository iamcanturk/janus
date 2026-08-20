/** Client helper: POST a scan request and consume the SSE stream. */

import type { DoneEvent, ErrorEvent, ScanRequest, TaskEvent } from './types';

export interface ScanHandlers {
  onTask: (task: TaskEvent) => void;
  onDone: (done: DoneEvent) => void;
  onError: (err: ErrorEvent) => void;
}

function parseEvent(chunk: string): { event: string; data: string } {
  let event = 'message';
  const data: string[] = [];
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).trim());
  }
  return { event, data: data.join('\n') };
}

export async function streamScan(
  req: ScanRequest,
  handlers: ScanHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });

  if (!res.ok || !res.body) {
    handlers.onError({ message: `Sunucu hatası (${res.status})` });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (!raw.trim()) continue;
      const { event, data } = parseEvent(raw);
      if (!data) continue;
      const parsed = JSON.parse(data);
      if (event === 'task') handlers.onTask(parsed as TaskEvent);
      else if (event === 'done') handlers.onDone(parsed as DoneEvent);
      else if (event === 'error') handlers.onError(parsed as ErrorEvent);
    }
  }
}
