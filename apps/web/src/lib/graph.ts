/** Build the capped graph view shared by the scan stream and saved-scan reads. */

import type { GraphView } from './types';

const MAX_GRAPH_NODES = 250;
const LOW_PRIORITY = new Set(['url', 'dns_record']);

interface NodeLike {
  id: string;
  type: string;
  value: string;
}
interface EdgeLike {
  from: string;
  to: string;
  relation: string;
}

export function buildGraphView(nodes: readonly NodeLike[], edges: readonly EdgeLike[]): GraphView {
  const ordered = [...nodes].sort(
    (a, b) => (LOW_PRIORITY.has(a.type) ? 1 : 0) - (LOW_PRIORITY.has(b.type) ? 1 : 0),
  );
  const kept = ordered.slice(0, MAX_GRAPH_NODES);
  const keptIds = new Set(kept.map((e) => e.id));
  return {
    nodes: kept.map((e) => ({ id: e.id, type: e.type, value: e.value })),
    edges: edges
      .filter((e) => keptIds.has(e.from) && keptIds.has(e.to))
      .map((e) => ({ from: e.from, to: e.to, relation: e.relation })),
    truncated: Math.max(0, nodes.length - kept.length),
  };
}
