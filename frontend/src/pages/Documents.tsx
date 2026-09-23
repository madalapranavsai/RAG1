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

  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [isDragging, setIsDragging] = useState(false);

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
        `Successfully indexed "${file.name}" into ${res.chunks_created} vector chunks!`
      );
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to process and index document.');
    } finally {
      setUploading(false);
      setIsDragging(false);
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

  // Filtered documents for client-side search & filtering with total null safety
  const filteredDocuments = (documents || []).filter((doc) => {
    if (!doc) return false;
    const title = (doc.title || '').toLowerCase();
    const query = (docSearchQuery || '').toLowerCase().trim();
    const matchesQuery = !query || title.includes(query);
    const fileType = (doc.file_type || (doc.title ? doc.title.split('.').pop() : '') || 'file').toLowerCase();
    const matchesType = docTypeFilter === 'all' || fileType === docTypeFilter.toLowerCase();
    return matchesQuery && matchesType;
  });

  const availableTypes = [
    'all',
    ...Array.from(
      new Set(
        (documents || [])
          .map((d) => (d?.file_type || (d?.title ? d.title.split('.').pop() : '') || '').toLowerCase())
          .filter(Boolean)
      )
    ),
  ];
  const totalChunksCount = (documents || []).reduce((acc, d) => acc + (d?.total_chunks || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Document Intelligence Vault
            <Sparkles className="w-5 h-5 text-sky-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage embedded workspace files and test real-time semantic retrieval rankings.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all interactive-press ${
              activeTab === 'vault'
                ? 'bg-slate-100 text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document Vault</span>
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all interactive-press ${
              activeTab === 'sandbox'
                ? 'bg-slate-100 text-slate-900 shadow-sm'
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
          {/* File Upload Dropzone with Live Drag States */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer shadow-lg ${
              isDragging
                ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
                : 'border-slate-700/80 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              accept=".pdf,.docx,.xlsx,.xls,.pptx,.csv,.txt,.md,.json,.html,.htm"
            />
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all mb-3 ${
              isDragging ? 'bg-sky-500/20 text-sky-300 scale-110' : 'bg-slate-800 text-sky-400 group-hover:scale-105'
            }`}>
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {uploading
                ? 'Processing & Embedding Document...'
                : isDragging
                ? 'Drop file to index into pgvector!'
                : 'Upload Workspace Documents'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Drag and drop files here or click to browse. Supports PDF, Word docs, spreadsheets, presentations, and code data up to 15MB.
            </p>
            <div className="mt-3.5 flex flex-wrap justify-center items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">PDF</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold text-slate-200">DOCX</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold text-slate-200">XLSX</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold text-slate-200">PPTX</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">CSV</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">TXT/MD</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">JSON</span>
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

          {/* Documents Table with Search and Type Filter */}
          <div className="surface-card rounded-2xl border border-slate-800/80 overflow-hidden">
            <div className="p-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/40">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Indexed Files
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300 num-tabular">
                  {filteredDocuments.length} / {documents.length}
                </span>
                <span className="hidden sm:inline text-xs text-slate-500">·</span>
                <span className="hidden sm:inline text-xs text-slate-400 font-mono num-tabular">
                  {totalChunksCount} total vector chunks
                </span>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 w-44"
                  />
                </div>
                {availableTypes.length > 2 && (
                  <div className="flex items-center gap-1">
                    {availableTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setDocTypeFilter(type)}
                        className={`px-2 py-1 rounded-md text-[10px] uppercase font-mono transition-all interactive-press ${
                          docTypeFilter === type
                            ? 'bg-slate-200 text-slate-900 font-bold'
                            : 'bg-slate-800/80 text-slate-400 hover:text-white'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading documents...</div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {documents.length === 0
                  ? 'No documents in this workspace yet. Upload your first document above.'
                  : 'No documents match your search query.'}
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
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {filteredDocuments.map((doc) => {
                      const displayTitle = doc?.title || 'Untitled Document';
                      const displayType = (doc?.file_type || (doc?.title ? doc.title.split('.').pop() : '') || 'FILE').toUpperCase();
                      const displayDate = doc?.created_at ? new Date(doc.created_at).toLocaleDateString() : '—';
                      const displaySize = doc?.file_size ? `${(Number(doc.file_size) / 1024).toFixed(1)} KB` : '—';
                      const chunkCount = doc?.total_chunks ?? 0;

                      return (
                        <tr key={doc.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-5 py-3 font-medium text-white flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="truncate max-w-xs">{displayTitle}</span>
                          </td>
                          <td className="px-5 py-3 uppercase text-[11px] font-mono text-slate-400">
                            {displayType}
                          </td>
                          <td className="px-5 py-3 text-slate-400 font-mono num-tabular">
                            {displaySize}
                          </td>
                          <td className="px-5 py-3 font-mono">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 num-tabular">
                              <Layers className="w-3 h-3 text-sky-400" />
                              {chunkCount}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              {doc.status || 'indexed'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-500 text-[11px] font-mono">
                            {displayDate}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => handleDelete(doc.id, displayTitle)}
                              title="Delete Document"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors interactive-press"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      )}

      {activeTab === 'sandbox' && (
        <div className="space-y-6">
          {/* Query & Parameter Form */}
          <div className="surface-card rounded-2xl p-5 border border-slate-800/80">
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
                    className="w-full rounded-xl bg-slate-950 border border-slate-700/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Similarity Threshold:</span>
                    <span className="font-mono text-sky-400 num-tabular">
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
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Max Chunks Count (k):</span>
                    <span className="font-mono text-sky-400 num-tabular">{matchCount}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={matchCount}
                    onChange={(e) => setMatchCount(parseInt(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sandboxLoading}
                className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-white text-slate-900 font-semibold px-4 py-2 text-xs shadow-sm transition-all interactive-press disabled:opacity-60"
              >
                <Search className="w-3.5 h-3.5 text-slate-900" />
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
              <div className="surface-card rounded-2xl p-8 text-center text-xs text-slate-400 border border-slate-800">
                No chunks matched the query with threshold {Math.round(matchThreshold * 100)}%. Try
                lowering the threshold slider.
              </div>
            )}

            {sandboxResults.map((match, idx) => (
              <div
                key={match.id || idx}
                className="surface-card rounded-2xl p-4 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <FileText className="w-4 h-4 text-sky-400" />
                    <span>{match.document_title || 'Workspace Document'}</span>
                    {match.source_page && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                        Page {match.source_page}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono font-bold num-tabular">
                      {Math.round(match.similarity * 100)}% match
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono num-tabular">Rank #{idx + 1}</span>
                  </div>
                </div>

                <p className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
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
