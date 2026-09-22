import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  Layers,
  Sparkles,
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
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/60 border border-indigo-500/20 shadow-2xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Tenant RAG + A2UI Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.email.split('@')[0]}
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Workspace: <strong className="text-white">{user?.workspace_name}</strong>. Grounded
              retrieval across all uploaded workspace documents with instant Generative UI widgets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Launch Chat</span>
            </Link>
            <Link
              to="/documents"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 text-xs font-semibold transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Upload Docs</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Indexed Documents</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{totalDocs}</div>
          <p className="text-[11px] text-slate-400 mt-1">PDF, TXT, MD in isolated vault</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Vector Chunks</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{totalChunks}</div>
          <p className="text-[11px] text-slate-400 mt-1">384-dim FastEmbed in pgvector</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Gemini Tokens</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{totalTokens.toLocaleString()}</div>
          <p className="text-[11px] text-slate-400 mt-1">Prompt & completion consumption</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Engine Status</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            100% Operational
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Gemini 2.5 Flash + Supabase</p>
        </div>
      </div>

      {/* A2UI Live Interactive Demonstration Feature */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Interactive A2UI Generative Capabilities
            </h3>
            <p className="text-xs text-slate-400">
              DocuMind dynamically streams metric cards, Chart.js visuals, data tables, and Mermaid
              flows directly in chat answers.
            </p>
          </div>
          <Link
            to="/chat"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Try in Chat <ArrowUpRight className="w-3.5 h-3.5" />
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

      {/* Recent Documents Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Workspace Documents</h3>
            <p className="text-xs text-slate-400">Files available for semantic retrieval</p>
          </div>
          <Link
            to="/documents"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Manage All <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-400">No documents uploaded yet.</p>
            <Link
              to="/documents"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Upload First Document
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium">
                  <th className="px-5 py-3">Document Title</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Chunks</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {documents.slice(0, 5).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-3 font-medium text-white flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{doc.title}</span>
                    </td>
                    <td className="px-5 py-3 uppercase text-[11px] font-mono text-slate-400">
                      {doc.file_type}
                    </td>
                    <td className="px-5 py-3 font-mono">{doc.total_chunks}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-[11px]">
                      {new Date(doc.created_at).toLocaleDateString()}
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
