/**
 * Timestamp converter — detects epoch seconds/millis or an ISO string. Pure,
 * takes `now` so callers/tests stay deterministic.
 */

export interface TimeInfo {
  readonly epochSec: number;
  readonly epochMs: number;
  readonly iso: string;
  readonly utc: string;
  readonly relative: string;
}

function relative(ms: number, now: number): string {
  const diff = Math.round((ms - now) / 1000);
  const abs = Math.abs(diff);
  const unit =
    abs < 60
      ? [abs, 'saniye']
      : abs < 3600
        ? [Math.round(abs / 60), 'dakika']
        : abs < 86400
          ? [Math.round(abs / 3600), 'saat']
          : [Math.round(abs / 86400), 'gün'];
  return diff <= 0 ? `${unit[0]} ${unit[1]} önce` : `${unit[0]} ${unit[1]} sonra`;
}

export function convertTime(input: string, now: number): TimeInfo | null {
  const s = input.trim();
  let ms: number;
  if (/^\d{10}$/.test(s)) ms = Number(s) * 1000;
  else if (/^\d{13}$/.test(s)) ms = Number(s);
  else {
    const parsed = Date.parse(s);
    if (Number.isNaN(parsed)) return null;
    ms = parsed;
  }
  const dt = new Date(ms);
  return {
    epochSec: Math.floor(ms / 1000),
    epochMs: ms,
    iso: dt.toISOString(),
    utc: dt.toUTCString(),
    relative: relative(ms, now),
  };
}
