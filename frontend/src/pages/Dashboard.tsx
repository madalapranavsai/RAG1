import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { DocumentItem, UsageStats } from '../types';
import { A2UIRenderer } from '../components/a2ui/A2UIRenderer';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, usageRes] = await Promise.all([
          api.documents.list(),
          api.usage.getStats(),
        ]);
        setDocuments(docsRes.documents || []);
        setUsage(usageRes);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };
    fetchData();
  }, []);

  const totalDocs = usage?.metrics.total_documents ?? documents.length;
  const totalChunks = usage?.metrics.total_chunks ?? 0;
  const totalTokens = usage?.metrics.total_tokens_used ?? 0;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      {/* Executive Masthead Banner */}
      <div className="paper-sheet p-6 sm:p-8 border border-[#e5e3dc] bg-white rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="stamp-badge font-mono text-[10px]">
                TENANT // {user?.workspace_name || 'DEFAULT'}
              </span>
              <span className="text-[11px] font-mono text-[#78716c]">
                SECURE POSTGRESQL + PGVECTOR
              </span>
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1c1917] tracking-tight">
              Executive Briefing & Intelligence Dossier
            </h1>
            <p className="text-xs text-[#57534e] max-w-xl leading-relaxed">
              Curated workspace repository for <strong>{user?.email}</strong>. Grounded
              semantic retrieval with Corrective RAG (CRAG) and generative analytical figures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1c1917] hover:bg-[#292524] text-white px-4 py-2.5 text-xs font-semibold shadow-sm transition-all interactive-press"
            >
              <MessageSquare className="w-4 h-4 text-white" />
              <span>Launch Inquiry</span>
            </Link>
            <Link
              to="/documents"
              className="inline-flex items-center gap-2 rounded-lg bg-[#faf9f5] hover:bg-[#f4f3ee] text-[#1c1917] border border-[#d5d2c7] px-4 py-2.5 text-xs font-semibold transition-all interactive-press"
            >
              <FileText className="w-4 h-4 text-[#78716c]" />
              <span>Register Documents</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Hairline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="paper-sheet rounded-xl p-5 border border-[#e5e3dc] bg-white space-y-2">
          <div className="flex items-center justify-between text-[#78716c]">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              Index // Documents
            </span>
            <FileText className="w-4 h-4 text-[#78716c]" />
          </div>
          <div className="text-2xl font-bold text-[#1c1917] num-tabular">{totalDocs}</div>
          <p className="text-[11px] text-[#78716c]">Tenant-isolated repository</p>
        </div>

        <div className="paper-sheet rounded-xl p-5 border border-[#e5e3dc] bg-white space-y-2">
          <div className="flex items-center justify-between text-[#78716c]">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              Index // Chunks
            </span>
            <Layers className="w-4 h-4 text-[#78716c]" />
          </div>
          <div className="text-2xl font-bold text-[#1c1917] num-tabular">{totalChunks}</div>
          <p className="text-[11px] text-[#78716c]">384-dim FastEmbed in pgvector</p>
        </div>

        <div className="paper-sheet rounded-xl p-5 border border-[#e5e3dc] bg-white space-y-2">
          <div className="flex items-center justify-between text-[#78716c]">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              Usage // Gemini Tokens
            </span>
            <Zap className="w-4 h-4 text-[#78716c]" />
          </div>
          <div className="text-2xl font-bold text-[#1c1917] num-tabular">{totalTokens.toLocaleString()}</div>
          <p className="text-[11px] text-[#78716c]">Synthesis prompt & response</p>
        </div>

        <div className="paper-sheet rounded-xl p-5 border border-[#e5e3dc] bg-white space-y-2">
          <div className="flex items-center justify-between text-[#78716c]">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              Status // RAG Engine
            </span>
            <ShieldCheck className="w-4 h-4 text-[#166534]" />
          </div>
          <div className="text-sm font-semibold text-[#166534] flex items-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            100% Operational
          </div>
          <p className="text-[11px] text-[#78716c]">Gemini 2.5 Flash + Supabase</p>
        </div>
      </div>

      {/* System Architecture Blueprint */}
      <div className="paper-sheet rounded-xl p-6 border border-[#e5e3dc] bg-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e5e3dc]">
          <div>
            <h3 className="font-editorial text-base font-semibold text-[#1c1917] flex items-center gap-2">
              System Blueprint & Retrieval Pipeline
            </h3>
            <p className="text-xs text-[#57534e] mt-0.5">
              LangGraph orchestration pipeline with corrective grading and generative analytical widgets.
            </p>
          </div>
          <Link
            to="/chat"
            className="text-xs font-semibold text-[#1c1917] hover:underline flex items-center gap-1"
          >
            Open in Dossier <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <A2UIRenderer
          payload={{
            type: 'mermaid',
            title: 'DocuMind Realtime RAG Flow',
            definition:
              'graph LR\n  Doc[User Upload] --> Fe[FastEmbed Engine]\n  Fe --> Pv[(pgvector Supabase)]\n  Q[User Query] --> Lg[LangGraph Workflow]\n  Pv -. Top Chunks .-> Lg\n  Lg --> Gem[Gemini 2.5 Flash]\n  Gem --> Ui[Grounded Answer + A2UI Widgets]',
          }}
        />
      </div>

      {/* Recent Documents Register */}
      <div className="paper-sheet rounded-xl border border-[#e5e3dc] bg-white overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#e5e3dc] bg-[#faf9f5]">
          <div>
            <h3 className="font-editorial text-base font-semibold text-[#1c1917]">Archival Register</h3>
            <p className="text-xs text-[#78716c]">Recently indexed workspace documents</p>
          </div>
          <Link
            to="/documents"
            className="text-xs font-semibold text-[#1c1917] hover:underline flex items-center gap-1"
          >
            View Full Register <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-[#a8a29e] mx-auto mb-2" />
            <p className="text-xs font-medium text-[#78716c]">No documents registered yet.</p>
            <Link
              to="/documents"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1c1917] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#292524]"
            >
              Register First Document
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e5e3dc] bg-white text-[#78716c] font-medium font-mono text-[10px] uppercase tracking-wider">
                  <th className="px-5 py-3">Folio</th>
                  <th className="px-5 py-3">Document Title</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Chunks</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e3dc] text-[#292524]">
                {documents.slice(0, 5).map((doc, idx) => {
                  const folioNumber = `№ ${String(idx + 1).padStart(3, '0')}`;
                  const fileType = doc?.file_type || (doc?.title ? doc.title.split('.').pop() : '') || 'file';

                  return (
                    <tr key={doc.id} className="hover:bg-[#faf9f5] transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-[#a8a29e]">
                        {folioNumber}
                      </td>
                      <td className="px-5 py-3 font-medium text-[#1c1917] flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#78716c]" />
                        <span>{doc.title}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="stamp-badge font-mono text-[10px] uppercase">
                          [{fileType}]
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono num-tabular text-[#57534e]">
                        {doc.total_chunks}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[#78716c] text-[11px] font-mono">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
