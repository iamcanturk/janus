'use client';

import { useMemo } from 'react';
import { ReactFlow, Background, Controls, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphView as GraphData } from '@/lib/types';

const TYPE_ORDER = [
  'domain',
  'subdomain',
  'ip',
  'port',
  'service',
  'technology',
  'certificate',
  'org',
  'cve',
  'email',
  'url',
  'dns_record',
];

const TYPE_COLOR: Record<string, string> = {
  domain: '#22d3ee',
  subdomain: '#38bdf8',
  ip: '#a78bfa',
  port: '#f472b6',
  service: '#fb923c',
  technology: '#facc15',
  certificate: '#34d399',
  org: '#4ade80',
  cve: '#f87171',
  email: '#e879f9',
  url: '#94a3b8',
  dns_record: '#64748b',
};

const PIVOTABLE = new Set(['domain', 'subdomain', 'ip']);

interface Props {
  graph: GraphData;
  onPivot: (type: string, value: string) => void;
}

export function GraphView({ graph, onPivot }: Props) {
  const { nodes, edges } = useMemo(() => {
    const columns = new Map<string, number>();
    const orderIndex = (t: string) => {
      const i = TYPE_ORDER.indexOf(t);
      return i === -1 ? TYPE_ORDER.length : i;
    };

    const rfNodes: Node[] = graph.nodes.map((n) => {
      const col = orderIndex(n.type);
      const row = columns.get(n.type) ?? 0;
      columns.set(n.type, row + 1);
      const color = TYPE_COLOR[n.type] ?? '#94a3b8';
      return {
        id: n.id,
        position: { x: col * 240, y: row * 64 },
        data: { label: `${n.type}\n${n.value}` },
        draggable: true,
        style: {
          background: '#0f172a',
          color: '#e2e8f0',
          border: `1px solid ${color}`,
          borderRadius: 8,
          fontSize: 11,
          width: 200,
          whiteSpace: 'pre-wrap',
          padding: 6,
          cursor: PIVOTABLE.has(n.type) ? 'pointer' : 'default',
        },
      };
    });

    const rfEdges: Edge[] = graph.edges.map((e, i) => ({
      id: `e${i}`,
      source: e.from,
      target: e.to,
      label: e.relation,
      style: { stroke: '#334155' },
      labelStyle: { fill: '#64748b', fontSize: 9 },
      labelBgStyle: { fill: '#0f172a' },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [graph]);

  const nodeIndex = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n] as const)),
    [graph.nodes],
  );

  return (
    <div className="space-y-2">
      <div className="h-[520px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          minZoom={0.1}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_e, node) => {
            const n = nodeIndex.get(node.id);
            if (n && PIVOTABLE.has(n.type)) onPivot(n.type, n.value);
          }}
        >
          <Background color="#1e293b" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
      <p className="text-xs text-slate-500">
        {graph.nodes.length} düğüm · {graph.edges.length} kenar
        {graph.truncated > 0 && ` · ${graph.truncated} düğüm okunabilirlik için gizlendi`} · bir
        domain/subdomain/ip düğümüne tıklayıp{' '}
        <span className="text-cyan-400">buradan devam et</span>.
      </p>
    </div>
  );
}
