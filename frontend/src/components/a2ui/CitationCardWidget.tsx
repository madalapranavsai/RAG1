import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import type { Citation } from '../../types';

interface CitationCardWidgetProps {
  citations: Citation[];
}

export const CitationCardWidget: React.FC<CitationCardWidgetProps> = ({ citations }) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!citations || citations.length === 0) return null;

  const toggleExpand = (idx: number) => {
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  const handleCopy = (content: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-slate-700/50">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-indigo-400" />
        <span>Referenced Grounding Sources ({citations.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {citations.map((c, idx) => {
          const isExpanded = expandedIdx === idx;
          const similarityScore = c.similarity ? Math.round(c.similarity * 100) : null;

          return (
            <div
              key={idx}
              onClick={() => toggleExpand(idx)}
              className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 cursor-pointer hover:border-slate-700 hover:bg-slate-800/40 transition-all text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {c.document_title || 'Document'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {similarityScore !== null && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                      {similarityScore}%
                    </span>
                  )}
                  {c.source_page && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      p. {c.source_page}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>Excerpt:</span>
                    <button
                      onClick={(e) => handleCopy(c.content, idx, e)}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
                    >
                      {copiedIdx === idx ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedIdx === idx ? 'Copied' : 'Copy chunk'}</span>
                    </button>
                  </div>
                  <p className="bg-slate-950/60 p-2 rounded text-[11px] font-mono leading-relaxed text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400 line-clamp-1 italic">
                  "{c.content.replace(/\s+/g, ' ').substring(0, 85)}..."
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
