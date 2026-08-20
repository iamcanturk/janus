/**
 * Minimal logger implementations for the runner.
 */

import type { Logger } from './types/check.js';

/** Discards all logs. Useful in tests and as a safe default. */
export const nullLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

/** Logs to the console with a stable prefix. */
export function createConsoleLogger(prefix = 'janus'): Logger {
  const line =
    (level: 'debug' | 'info' | 'warn' | 'error') =>
    (message: string, meta?: Record<string, unknown>) => {
      const tag = `[${prefix}] ${level.toUpperCase()}`;
      if (meta) console[level](tag, message, meta);
      else console[level](tag, message);
    };
  return { debug: line('debug'), info: line('info'), warn: line('warn'), error: line('error') };
}
