import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { A2UIMetric } from '../../types';

interface MetricCardWidgetProps {
  title?: string;
  metrics?: A2UIMetric[];
}

export const MetricCardWidget: React.FC<MetricCardWidgetProps> = ({ title, metrics = [] }) => {
  return (
    <div className="my-3">
      {title && (
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#78716c] mb-2.5 flex items-center gap-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1c1917]"></span>
          {title}
        </h4>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {metrics.map((m, idx) => {
          const isUp = m.trend === 'up';
          const isDown = m.trend === 'down';

          return (
            <div
              key={idx}
              className="bg-[#faf9f5] rounded-lg p-3 border border-[#e5e3dc] transition-all hover:border-[#a8a29e]"
            >
              <div className="flex items-center justify-between text-xs text-[#78716c] mb-1">
                <span className="font-medium truncate text-[#44403c]">{m.label}</span>
                {m.change && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono num-tabular ${
                      isUp
                        ? 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]'
                        : isDown
                        ? 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                        : 'bg-[#f4f3ee] text-[#57534e] border border-[#e5e3dc]'
                    }`}
                  >
                    {isUp && <TrendingUp className="w-2.5 h-2.5" />}
                    {isDown && <TrendingDown className="w-2.5 h-2.5" />}
                    {!isUp && !isDown && <Minus className="w-2.5 h-2.5" />}
                    {m.change}
                  </span>
                )}
              </div>
              <div className="text-xl font-bold tracking-tight text-[#1c1917] num-tabular">
                {m.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
