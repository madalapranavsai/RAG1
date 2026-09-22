import React from 'react';
import { Clock } from 'lucide-react';

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
}

interface TimelineWidgetProps {
  title?: string;
  events?: TimelineEvent[];
}

export const TimelineWidget: React.FC<TimelineWidgetProps> = ({ title, events = [] }) => {
  return (
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 p-3.5 shadow-lg">
      <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-slate-200">
        <Clock className="w-3.5 h-3.5 text-indigo-400" />
        <span>{title || 'Sequential Timeline'}</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-500/30">
        {events.map((ev, idx) => (
          <div key={idx} className="relative group">
            {/* Glowing timeline node */}
            <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-indigo-500 group-hover:scale-125 transition-transform" />
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="text-[11px] font-semibold text-indigo-400 font-mono tracking-wider">
                {ev.date}
              </span>
              <h5 className="text-xs font-bold text-white group-hover:text-indigo-200 transition-colors">
                {ev.title}
              </h5>
            </div>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">{ev.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
