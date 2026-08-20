/**
 * @janus/report — turn a scan into a shareable, tamper-evident Markdown report.
 */

export { renderMarkdown, renderReport } from './render.js';
export { sha256Hex } from './digest.js';
export type { ReportInput, ReportTask, RenderedReport } from './types.js';
