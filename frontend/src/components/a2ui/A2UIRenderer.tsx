import React from 'react';
import { Sparkles } from 'lucide-react';
import type { A2UIPayload } from '../../types';
import { MetricCardWidget } from './MetricCardWidget';
import { TableWidget } from './TableWidget';
import { ChartWidget } from './ChartWidget';
import { MermaidWidget } from './MermaidWidget';
import { TimelineWidget } from './TimelineWidget';

interface A2UIRendererProps {
  payload: A2UIPayload;
}

export const A2UIRenderer: React.FC<A2UIRendererProps> = ({ payload }) => {
  if (!payload || !payload.type) return null;

  const renderWidget = () => {
    switch (payload.type) {
      case 'metric_card':
        return <MetricCardWidget title={payload.title} metrics={payload.metrics} />;
      case 'table':
        return <TableWidget title={payload.title} headers={payload.headers} rows={payload.rows} />;
      case 'bar_chart':
      case 'line_chart':
        return (
          <ChartWidget
            type={payload.type}
            title={payload.title}
            labels={payload.labels}
            datasets={payload.datasets}
          />
        );
      case 'mermaid':
        return <MermaidWidget title={payload.title} definition={payload.definition} />;
      case 'timeline':
        return <TimelineWidget title={payload.title} events={payload.events} />;
      default:
        return null;
    }
  };

  return (
    <div className="my-3 p-1 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-sky-500/20 shadow-xl border border-indigo-500/30">
      <div className="rounded-[14px] bg-slate-950/90 p-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-[10px] text-indigo-400 font-mono">
          <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-indigo-400 animate-spin-slow" />
            <span>Generative A2UI Widget</span>
          </div>
          <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/30 text-[10px]">
            {payload.type}
          </span>
        </div>
        {renderWidget()}
      </div>
    </div>
  );
};
