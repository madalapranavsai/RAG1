import React, { useEffect, useState } from 'react';
import { Activity, Zap, FileText, Layers, Clock } from 'lucide-react';
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
    return <div className="p-8 text-center text-xs text-slate-500">Loading usage metrics...</div>;
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
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Usage & Resource Limits
          <Activity className="w-5 h-5 text-indigo-400" />
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor token consumption, vector capacity, and workspace activity events in real-time.
        </p>
      </div>

      {/* Quota Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              Document Vault
            </span>
            <span className="font-mono text-indigo-400">
              {docs} / {maxDocs}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all"
              style={{ width: `${Math.min(100, (docs / maxDocs) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {maxDocs - docs} document slots remaining in free tier.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-400" />
              Gemini Token Quota
            </span>
            <span className="font-mono text-purple-400">
              {totalTokens.toLocaleString()} / {maxTokens.toLocaleString()}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all"
              style={{ width: `${Math.min(100, (totalTokens / maxTokens) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {promptTokens.toLocaleString()} prompt · {completionTokens.toLocaleString()} completion
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              pgvector Index
            </span>
            <span className="font-mono text-emerald-400">{chunks} Chunks</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
              style={{ width: `${Math.min(100, (chunks / 2500) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            HNSW vector indexing on Supabase Cloud.
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Recent Usage Audit Events
          </h3>
          <p className="text-xs text-slate-400">Immutable ledger of LLM tokens and API operations</p>
        </div>

        {(!stats?.recent_events || stats.recent_events.length === 0) ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No events recorded yet. Send a message in chat to record token events.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium">
                  <th className="px-5 py-3">Event Type</th>
                  <th className="px-5 py-3">Quantity</th>
                  <th className="px-5 py-3">Metadata</th>
                  <th className="px-5 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {stats.recent_events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                        {evt.event_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-white">
                      {evt.quantity.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-400">
                      {evt.metadata ? JSON.stringify(evt.metadata) : '-'}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-[11px]">
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
