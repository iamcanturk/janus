# @janus/web

Next.js 15 (App Router) + Tailwind v4 front end.

A user enters a target, picks a profile, and watches the checklist fill live as
each check completes.

## How it works

- **`/`** renders the scan form (target + type + profile). Active profiles are
  gated behind a red "sends live packets — are you authorized?" confirmation.
- **`POST /api/scan`** (Node runtime) runs `runScan` from `@janus/core` and
  streams each task result as a Server-Sent Event, then a final summary. The
  passive modules `fetch` third-party sources server-side, so requests come from
  the server, not the user's browser.
- The client (`ScanClient`) reads the SSE stream and updates the live checklist
  (status icons, running counts, findings list).

This is the interactive demo path. The durable BullMQ + Postgres path from
`@janus/queue` / `@janus/db` is used for background jobs.

## Develop

```bash
pnpm --filter @janus/core --filter @janus/checks build   # deps must be built
pnpm --filter @janus/web dev
```

Then open http://localhost:3000. UI copy is Turkish; code is English.
