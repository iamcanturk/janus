/**
 * Notifier abstraction for monitoring.
 *
 * The default logs. A webhook notifier is available but only sends when a URL is
 * explicitly configured — Janus never posts to an external service on its own.
 */

export interface Notifier {
  notify(summary: string, body?: string): Promise<void>;
}

/** Logs the summary; never leaves the process. Safe default. */
export const logNotifier: Notifier = {
  async notify(summary) {
    console.log(`[janus:monitor] ${summary}`);
  },
};

/**
 * POSTs `{ summary, body }` as JSON to a webhook. Only construct this when the
 * user has configured a URL (e.g. from MONITOR_WEBHOOK_URL).
 */
export function webhookNotifier(url: string): Notifier {
  return {
    async notify(summary, body) {
      await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ summary, body }),
      });
    },
  };
}
