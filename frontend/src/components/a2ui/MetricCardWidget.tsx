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
        <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          {title}
        </h4>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {metrics.map((m, idx) => {
          const isUp = m.trend === 'up';
          const isDown = m.trend === 'down';

          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/60 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-all"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-medium truncate">{m.label}</span>
                {m.change && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                      isUp
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isDown
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    {isUp && <TrendingUp className="w-3 h-3" />}
                    {isDown && <TrendingDown className="w-3 h-3" />}
                    {!isUp && !isDown && <Minus className="w-3 h-3" />}
                    {m.change}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                {m.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
