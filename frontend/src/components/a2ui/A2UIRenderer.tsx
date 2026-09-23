import React from 'react';
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
    <div className="my-4 paper-sheet p-3.5 border border-[#e5e3dc] bg-white rounded-xl">
      <div className="flex items-center justify-between border-b border-[#e5e3dc] pb-2 mb-3 text-[10px] text-[#78716c] font-mono">
        <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[#44403c]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1c1917]" />
          <span>Figure // Generative Synthesis</span>
        </div>
        <span className="stamp-badge font-mono text-[9px] uppercase">
          {payload.type.replace('_', ' ')}
        </span>
      </div>
      {renderWidget()}
    </div>
  );
};

