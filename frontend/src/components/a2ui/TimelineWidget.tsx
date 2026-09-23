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
    <div className="my-3 rounded-lg border border-[#e5e3dc] bg-white p-3.5">
      <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-[#1c1917]">
        <Clock className="w-3.5 h-3.5 text-[#78716c]" />
        <span>{title || 'Sequential Sequence'}</span>
      </div>

      <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[#e5e3dc]">
        {events.map((ev, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline node */}
            <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#1c1917]" />
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="text-[10px] font-semibold text-[#78716c] font-mono tracking-wider">
                {ev.date}
              </span>
              <h5 className="text-xs font-bold text-[#1c1917]">
                {ev.title}
              </h5>
            </div>
            <p className="mt-1 text-xs text-[#57534e] leading-relaxed">{ev.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
