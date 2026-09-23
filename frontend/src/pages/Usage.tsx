import React, { useEffect, useState } from 'react';
import { Zap, FileText, Layers, Clock } from 'lucide-react';
import { api } from '../api/client';
import type { UsageStats } from '../types';

export const Usage: React.FC = () => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await api.usage.getStats();
        setStats(res);
      } catch (err) {
        console.error('Failed to load usage stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-[#78716c] font-mono">
        Loading operational ledger...
      </div>
    );
  }

  const metrics = stats?.metrics;
  const promptTokens = metrics?.prompt_tokens ?? 0;
  const completionTokens = metrics?.completion_tokens ?? 0;
  const totalTokens = metrics?.total_tokens_used ?? 0;
  const docs = metrics?.total_documents ?? 0;
  const chunks = metrics?.total_chunks ?? 0;

  // Free Tier Quotas
  const maxDocs = 50;
  const maxTokens = 500000;

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-[#e5e3dc] pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="stamp-badge font-mono text-[10px]">OPERATIONAL ACCOUNTING</span>
          <span className="text-[11px] font-mono text-[#78716c]">AUDIT TRAIL</span>
        </div>
        <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#1c1917] flex items-center gap-2">
          Resource Capacity & Operational Ledger
        </h1>
        <p className="text-xs text-[#57534e] mt-1 max-w-2xl leading-relaxed">
          Monitor token consumption, vector capacity, and tenant-isolated operations in real-time.
        </p>
      </div>

      {/* Quota Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="paper-sheet rounded-xl p-5 border border-[#e5e3dc] bg-white space-y-3">
          <div className="flex items-center justify-between text-xs text-[#78716c]">
            <span className="font-mono font-semibold text-[#1c1917] flex items-center gap-1.5 text-[11px]">
              <FileText className="w-3.5 h-3.5 text-[#78716c]" />
              Document Vault
            </span>
            <span className="font-mono text-[#1c1917] num-tabular">
              {docs} / {maxDocs}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#e5e3dc] overflow-hidden">
            <div
              className="h-full bg-[#1c1917] transition-all"
              style={{ width: `${Math.min(100, (docs / maxDocs) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#78716c]">
            {maxDocs - docs} document slots remaining in tier.
          </p>
        </div>

        <div className="paper-sheet rounded-xl p-5 border border-[#e5e3dc] bg-white space-y-3">
          <div className="flex items-center justify-between text-xs text-[#78716c]">
            <span className="font-mono font-semibold text-[#1c1917] flex items-center gap-1.5 text-[11px]">
              <Zap className="w-3.5 h-3.5 text-[#78716c]" />
              Gemini Token Quota
            </span>
            <span className="font-mono text-[#1c1917] num-tabular">
              {totalTokens.toLocaleString()} / {maxTokens.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#e5e3dc] overflow-hidden">
            <div
              className="h-full bg-[#1c1917] transition-all"
              style={{ width: `${Math.min(100, (totalTokens / maxTokens) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#78716c] num-tabular">
            {promptTokens.toLocaleString()} prompt · {completionTokens.toLocaleString()} completion
          </p>
        </div>

        <div className="paper-sheet rounded-xl p-5 border border-[#e5e3dc] bg-white space-y-3">
          <div className="flex items-center justify-between text-xs text-[#78716c]">
            <span className="font-mono font-semibold text-[#1c1917] flex items-center gap-1.5 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-[#78716c]" />
              pgvector Index
            </span>
            <span className="font-mono text-[#1c1917] num-tabular">{chunks} Chunks</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#e5e3dc] overflow-hidden">
            <div
              className="h-full bg-[#1c1917] transition-all"
              style={{ width: `${Math.min(100, (chunks / 2500) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#78716c]">
            HNSW vector indexing on Supabase Cloud.
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="paper-sheet rounded-xl border border-[#e5e3dc] bg-white overflow-hidden">
        <div className="p-4 border-b border-[#e5e3dc] bg-[#faf9f5]">
          <h3 className="font-editorial text-sm font-semibold text-[#1c1917] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#78716c]" />
            Recent Usage Audit Events
          </h3>
          <p className="text-xs text-[#78716c]">Immutable ledger of LLM tokens and API operations</p>
        </div>

        {(!stats?.recent_events || stats.recent_events.length === 0) ? (
          <div className="p-8 text-center text-xs text-[#a8a29e]">
            No events recorded yet. Send a message in chat to record token events.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e5e3dc] bg-white text-[#78716c] font-medium font-mono text-[10px] uppercase tracking-wider">
                  <th className="px-5 py-3">Event Type</th>
                  <th className="px-5 py-3">Quantity</th>
                  <th className="px-5 py-3">Metadata</th>
                  <th className="px-5 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e3dc] text-[#292524]">
                {stats.recent_events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#faf9f5] transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px]">
                      <span className="stamp-badge font-mono text-[9px] uppercase">
                        {evt.event_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-[#1c1917] num-tabular">
                      {evt.quantity.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-[#78716c]">
                      {evt.metadata ? JSON.stringify(evt.metadata) : '—'}
                    </td>
                    <td className="px-5 py-3 text-[#78716c] text-[11px] font-mono">
                      {new Date(evt.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
