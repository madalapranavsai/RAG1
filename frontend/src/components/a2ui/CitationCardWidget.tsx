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
    <div className="mt-3 pt-3 border-t border-[#e5e3dc]">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#78716c] mb-2 flex items-center gap-1.5 font-mono">
        <FileText className="w-3 h-3 text-[#1c1917]" />
        <span>Grounded Sources ({citations.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {citations.map((c, idx) => {
          const isExpanded = expandedIdx === idx;
          const similarityScore = c.similarity ? Math.round(c.similarity * 100) : null;

          return (
            <div
              key={idx}
              onClick={() => toggleExpand(idx)}
              className="rounded-lg border border-[#e5e3dc] bg-[#faf9f5] p-2.5 cursor-pointer hover:border-[#1c1917] transition-all text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-[#78716c] shrink-0" />
                  <span className="text-xs font-medium text-[#1c1917] truncate">
                    {c.document_title || 'Document'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {similarityScore !== null && (
                    <span className="stamp-badge font-mono text-[9px] num-tabular">
                      {similarityScore}% match
                    </span>
                  )}
                  {c.source_page && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f4f3ee] text-[#78716c] border border-[#e5e3dc] font-mono">
                      p. {c.source_page}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[#78716c]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#78716c]" />
                  )}
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-2 pt-2 border-t border-[#e5e3dc] text-xs text-[#44403c]">
                  <div className="flex items-center justify-between text-[11px] text-[#78716c] mb-1">
                    <span className="font-mono text-[10px] uppercase">Verbatim Chunk:</span>
                    <button
                      onClick={(e) => handleCopy(c.content, idx, e)}
                      className="flex items-center gap-1 text-[#78716c] hover:text-[#1c1917]"
                    >
                      {copiedIdx === idx ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="bg-white p-2.5 rounded border border-[#e5e3dc] text-[11px] font-mono leading-relaxed text-[#292524] max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-[#78716c] line-clamp-1 italic">
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
