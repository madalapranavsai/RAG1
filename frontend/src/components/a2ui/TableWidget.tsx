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
    <div className="my-3 rounded-lg border border-[#e5e3dc] bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#f4f3ee] border-b border-[#e5e3dc] text-xs">
        <div className="flex items-center gap-2 font-semibold text-[#1c1917]">
          <TableIcon className="w-3.5 h-3.5 text-[#78716c]" />
          <span>{title || 'Structured Data Ledger'}</span>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 5 && (
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#a8a29e]" />
              <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter rows..."
                className="pl-6 pr-2 py-0.5 text-[11px] bg-white border border-[#e5e3dc] rounded text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917]"
              />
            </div>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-[#eae8e1] border border-[#e5e3dc] text-[#44403c] text-[11px] font-medium transition-colors"
            title="Copy as TSV"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-[#78716c]" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          {headers.length > 0 && (
            <thead>
              <tr className="border-b border-[#e5e3dc] bg-[#faf9f5] text-[#78716c] font-medium font-mono text-[11px]">
                {headers.map((h, idx) => (
                  <th key={idx} className="px-3.5 py-2 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-[#e5e3dc] text-[#292524]">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length || 1} className="px-3.5 py-4 text-center text-[#a8a29e]">
                  No matching rows found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#faf9f5] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 whitespace-nowrap font-mono text-[11px]">
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
