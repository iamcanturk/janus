# @janus/report

Turns a scan into a shareable, **tamper-evident** Markdown report.

- `renderMarkdown(input)` — the report body: target, profile, timestamp, summary,
  findings grouped by severity (critical → info), entity-type breakdown and the
  check checklist.
- `renderReport(input)` — appends an **integrity block** with the SHA-256 of the
  body plus the timestamp. Any later edit to the content makes the digest no
  longer match, so the report is self-verifying.
- `sha256Hex(text)` — Web Crypto digest, isomorphic (browser + Node 20+).

`ReportInput` is a plain shape both the worker CLI and the web app build from a
`ScanReport` / stream, so rendering is shared.

## Usage

```ts
import { renderReport } from '@janus/report';

const { markdown, sha256 } = await renderReport({
  target: { type: 'domain', value: 'example.com' },
  profileId: 'pasif-recon',
  generatedAt: new Date().toISOString(),
  counts,
  entityTypes,
  findings,
  tasks,
});
```

- **CLI**: `pnpm --filter @janus/worker scan example.com --report out.md`
- **Web**: the "Rapor indir" button after a scan downloads the same report,
  generated entirely in the browser.
