import React, { useState } from 'react';
import { Table as TableIcon, Copy, Check, Search } from 'lucide-react';

interface TableWidgetProps {
  title?: string;
  headers?: string[];
  rows?: (string | number)[][];
}

export const TableWidget: React.FC<TableWidgetProps> = ({ title, headers = [], rows = [] }) => {
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('');

  const handleCopy = () => {
    const csv = [
      headers.join('\t'),
      ...rows.map(r => r.join('\t'))
    ].join('\n');
    navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredRows = rows.filter(r =>
    r.some(cell => String(cell).toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/60 border-b border-slate-700/60 text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <TableIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>{title || 'Structured Data Table'}</span>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 5 && (
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter rows..."
                className="pl-6 pr-2 py-0.5 text-[11px] bg-slate-900/80 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
            title="Copy as TSV"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          {headers.length > 0 && (
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-800/40 text-slate-400 font-medium">
                {headers.map((h, idx) => (
                  <th key={idx} className="px-3.5 py-2 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length || 1} className="px-3.5 py-4 text-center text-slate-500">
                  No matching rows found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
