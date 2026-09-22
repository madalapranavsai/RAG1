import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  Search,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import type { DocumentItem, ChunkMatch } from '../types';

export const Documents: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vault' | 'sandbox'>('vault');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sandbox state
  const [sandboxQuery, setSandboxQuery] = useState('');
  const [matchThreshold, setMatchThreshold] = useState(0.15);
  const [matchCount, setMatchCount] = useState(4);
  const [sandboxResults, setSandboxResults] = useState<ChunkMatch[]>([]);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxSearched, setSandboxSearched] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      const res = await api.documents.list();
      setDocuments(res.documents || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setUploadMessage(null);
    setUploadError(null);

    try {
      const res = await api.documents.upload(file);
      setUploadMessage(
        `Successfully uploaded and embedded "${file.name}" into ${res.chunks_created} vector chunks!`
      );
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to process and index document.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" and its vector embeddings?`)) {
      return;
    }
    try {
      await api.documents.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(`Delete failed: ${err?.message}`);
    }
  };

  const handleSandboxSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxQuery.trim()) return;
    setSandboxLoading(true);
    setSandboxSearched(true);
    try {
      const res = await api.documents.search(sandboxQuery, matchThreshold, matchCount);
      setSandboxResults(res.matches || []);
    } catch (err: any) {
      alert(`Search failed: ${err?.message}`);
    } finally {
      setSandboxLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Document Intelligence Vault
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage embedded workspace files and test real-time semantic retrieval rankings.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'vault'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document Vault</span>
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sandbox'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Retrieval Sandbox</span>
          </button>
        </div>
      </div>

      {activeTab === 'vault' && (
        <div className="space-y-6">
          {/* File Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700/80 bg-slate-900/40 p-8 text-center hover:border-indigo-500 hover:bg-slate-900/70 transition-all cursor-pointer shadow-lg"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              accept=".pdf,.txt,.md,.docx"
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all mb-3">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {uploading ? 'Processing & Embedding Document...' : 'Upload Workspace Documents'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Drag and drop your PDF, Markdown, or text files here, or click to browse. Files are
              automatically chunked and indexed via FastEmbed 384-dim vectors.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">PDF</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">TXT</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">MD</span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {uploadMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{uploadMessage}</span>
            </div>
          )}
          {uploadError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Documents Table */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Indexed Files ({documents.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No documents in this workspace yet. Upload your first document above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium">
                      <th className="px-5 py-3">Document Title</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">File Size</th>
                      <th className="px-5 py-3">Vector Chunks</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Indexed On</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-3 font-medium text-white flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate max-w-xs">{doc.title}</span>
                        </td>
                        <td className="px-5 py-3 uppercase text-[11px] font-mono text-slate-400">
                          {doc.file_type}
                        </td>
                        <td className="px-5 py-3 text-slate-400 font-mono">
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '-'}
                        </td>
                        <td className="px-5 py-3 font-mono">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            <Layers className="w-3 h-3 text-indigo-400" />
                            {doc.total_chunks}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-[11px]">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDelete(doc.id, doc.title)}
                            title="Delete Document"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sandbox' && (
        <div className="space-y-6">
          {/* Query & Parameter Form */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <form onSubmit={handleSandboxSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Semantic Query
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={sandboxQuery}
                    onChange={(e) => setSandboxQuery(e.target.value)}
                    placeholder="e.g., What are our Q3 revenue numbers and growth targets?"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Similarity Threshold:</span>
                    <span className="font-mono text-indigo-400">
                      {Math.round(matchThreshold * 100)}% ({matchThreshold})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.8"
                    step="0.05"
                    value={matchThreshold}
                    onChange={(e) => setMatchThreshold(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Max Chunks Count (k):</span>
                    <span className="font-mono text-indigo-400">{matchCount}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={matchCount}
                    onChange={(e) => setMatchCount(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sandboxLoading}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-60"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{sandboxLoading ? 'Executing Cosine Search...' : 'Run Similarity Match'}</span>
              </button>
            </form>
          </div>

          {/* Results Display */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Retrieval Ranking Matches ({sandboxResults.length})
            </h3>

            {sandboxSearched && sandboxResults.length === 0 && (
              <div className="glass-card rounded-2xl p-8 text-center text-xs text-slate-400">
                No chunks matched the query with threshold {Math.round(matchThreshold * 100)}%. Try
                lowering the threshold slider.
              </div>
            )}

            {sandboxResults.map((match, idx) => (
              <div
                key={match.id || idx}
                className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>{match.document_title || 'Workspace Document'}</span>
                    {match.source_page && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                        Page {match.source_page}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono font-bold">
                      {Math.round(match.similarity * 100)}% match
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Rank #{idx + 1}</span>
                  </div>
                </div>

                <p className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {match.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
