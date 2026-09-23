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
    <div className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e3dc] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="stamp-badge">REGISTER</span>
            <span className="font-mono text-[10px] text-[#78716c]">SEC. 02</span>
          </div>
          <h1 className="font-editorial text-3xl font-bold tracking-tight text-[#1c1917]">
            Archival Vault & Retrieval Sandbox
          </h1>
          <p className="text-xs text-[#78716c] mt-1.5 max-w-xl leading-relaxed">
            Catalogued workspace documents, embeddings index, and real-time semantic cosine similarity calibration.
          </p>
        </div>

        <div className="flex rounded-lg bg-[#eae8e1] p-1 border border-[#e5e3dc] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all interactive-press ${
              activeTab === 'vault'
                ? 'bg-[#ffffff] text-[#1c1917] font-semibold shadow-xs'
                : 'text-[#57534e] hover:text-[#1c1917]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document Vault</span>
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all interactive-press ${
              activeTab === 'sandbox'
                ? 'bg-[#ffffff] text-[#1c1917] font-semibold shadow-xs'
                : 'text-[#57534e] hover:text-[#1c1917]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Retrieval Sandbox</span>
          </button>
        </div>
      </div>

      {activeTab === 'vault' && (
        <div className="space-y-8">
          {/* File Upload Dropzone with Archival Blueprint Border */}
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
            className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-[#1c1917] bg-[#f5f4ef] scale-[1.01]'
                : 'border-[#d6d3cd] bg-[#ffffff] hover:border-[#1c1917] hover:bg-[#faf9f6]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              accept=".pdf,.docx,.xlsx,.xls,.pptx,.csv,.txt,.md,.json,.html,.htm"
            />
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg border transition-all mb-3.5 ${
              isDragging
                ? 'bg-[#1c1917] text-white border-[#1c1917]'
                : 'bg-[#f5f4ef] text-[#44403c] border-[#e5e3dc] group-hover:bg-[#1c1917] group-hover:text-white group-hover:border-[#1c1917]'
            }`}>
              <UploadCloud className="h-5 w-5" />
            </div>
            <h3 className="font-editorial text-base font-bold text-[#1c1917]">
              {uploading
                ? 'Ingesting & Chunking Document...'
                : isDragging
                ? 'Release file to deposit into archival index'
                : 'Deposit Primary Source Documents'}
            </h3>
            <p className="text-xs text-[#78716c] mt-1.5 max-w-md leading-relaxed">
              Drag and drop files here or click to browse. Automatically extracts, chunks, and creates vector embeddings for documents up to 15MB.
            </p>
            <div className="mt-4 flex flex-wrap justify-center items-center gap-1.5 font-mono text-[9px] text-[#78716c]">
              <span className="px-2 py-0.5 rounded border border-[#e5e3dc] bg-[#f5f4ef]">PDF</span>
              <span className="px-2 py-0.5 rounded border border-[#e5e3dc] bg-[#f5f4ef]">DOCX</span>
              <span className="px-2 py-0.5 rounded border border-[#e5e3dc] bg-[#f5f4ef]">XLSX</span>
              <span className="px-2 py-0.5 rounded border border-[#e5e3dc] bg-[#f5f4ef]">PPTX</span>
              <span className="px-2 py-0.5 rounded border border-[#e5e3dc] bg-[#f5f4ef]">CSV</span>
              <span className="px-2 py-0.5 rounded border border-[#e5e3dc] bg-[#f5f4ef]">TXT / MD</span>
              <span className="px-2 py-0.5 rounded border border-[#e5e3dc] bg-[#f5f4ef]">JSON / HTML</span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {uploadMessage && (
            <div className="flex items-center gap-2.5 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] p-4 text-xs text-[#166534]">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16a34a]" />
              <span className="font-medium">{uploadMessage}</span>
            </div>
          )}
          {uploadError && (
            <div className="flex items-center gap-2.5 rounded-lg bg-[#fef2f2] border border-[#fecaca] p-4 text-xs text-[#991b1b]">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#dc2626]" />
              <span className="font-medium">{uploadError}</span>
            </div>
          )}

          {/* Documents Archival Table */}
          <div className="paper-sheet rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#e5e3dc] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#f8f7f4]">
              <div className="flex items-center gap-2.5">
                <span className="font-editorial text-sm font-bold text-[#1c1917]">
                  Archival Index
                </span>
                <span className="stamp-badge">
                  {filteredDocuments.length} OF {documents.length} ENTRIES
                </span>
                <span className="text-xs text-[#a8a29e]">·</span>
                <span className="text-xs font-mono text-[#78716c] num-tabular">
                  {totalChunksCount} total vector chunks
                </span>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a8a29e]" />
                  <input
                    type="text"
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    placeholder="Search titles..."
                    className="pl-8 pr-3 py-1 rounded border border-[#d6d3cd] bg-[#ffffff] text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] w-48 font-sans"
                  />
                </div>
                {availableTypes.length > 2 && (
                  <div className="flex items-center gap-1">
                    {availableTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setDocTypeFilter(type)}
                        className={`px-2 py-1 rounded text-[9px] uppercase font-mono transition-all interactive-press ${
                          docTypeFilter === type
                            ? 'bg-[#1c1917] text-white font-semibold'
                            : 'bg-[#f4f3ee] text-[#78716c] hover:text-[#1c1917] border border-[#e5e3dc]'
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
              <div className="p-10 text-center text-xs text-[#78716c] font-mono">Loading archive...</div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#78716c]">
                {documents.length === 0
                  ? 'No documents currently deposited in this workspace. Add your first record above.'
                  : 'No documents match the search criteria.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5e3dc] bg-[#f8f7f4] text-[#78716c] font-mono text-[10px] uppercase tracking-wider">
                      <th className="px-5 py-3 w-12 text-center">№</th>
                      <th className="px-5 py-3">Document Title</th>
                      <th className="px-5 py-3">Format</th>
                      <th className="px-5 py-3">File Size</th>
                      <th className="px-5 py-3">Chunks</th>
                      <th className="px-5 py-3">Index State</th>
                      <th className="px-5 py-3">Deposited</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e3dc] text-[#27272a]">
                    {filteredDocuments.map((doc, idx) => {
                      const displayTitle = doc?.title || 'Untitled Document';
                      const displayType = (doc?.file_type || (doc?.title ? doc.title.split('.').pop() : '') || 'FILE').toUpperCase();
                      const displayDate = doc?.created_at ? new Date(doc.created_at).toLocaleDateString() : '—';
                      const displaySize = doc?.file_size ? `${(Number(doc.file_size) / 1024).toFixed(1)} KB` : '—';
                      const chunkCount = doc?.total_chunks ?? 0;
                      const folioNumber = String(idx + 1).padStart(3, '0');

                      return (
                        <tr key={doc.id} className="hover:bg-[#fcfbf9] transition-colors">
                          <td className="px-5 py-3 font-mono text-[10px] text-[#a8a29e] text-center num-tabular">
                            {folioNumber}
                          </td>
                          <td className="px-5 py-3 font-medium text-[#1c1917] flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-[#78716c] shrink-0" />
                            <span className="truncate max-w-sm">{displayTitle}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="stamp-badge">{displayType}</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-[#78716c] num-tabular">
                            {displaySize}
                          </td>
                          <td className="px-5 py-3 font-mono">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#e5e3dc] bg-[#f5f4ef] text-[#44403c] num-tabular text-[11px]">
                              <Layers className="w-3 h-3 text-[#78716c]" />
                              {chunkCount}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-0.5 rounded">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                              {doc.status || 'ready'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-[#78716c] text-[11px] font-mono">
                            {displayDate}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => handleDelete(doc.id, displayTitle)}
                              title="Delete Record"
                              className="p-1.5 text-[#78716c] hover:text-[#991b1b] hover:bg-[#fef2f2] rounded transition-colors interactive-press"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
          <div className="paper-sheet rounded-xl p-6 border border-[#e5e3dc]">
            <div className="border-b border-[#e5e3dc] pb-4 mb-5">
              <h2 className="font-editorial text-lg font-bold text-[#1c1917]">Semantic Retrieval Calibrator</h2>
              <p className="text-xs text-[#78716c] mt-0.5">Test vector chunk proximity and similarity ranking in Supabase pgvector without chat LLM generation.</p>
            </div>
            <form onSubmit={handleSandboxSearch} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#1c1917] mb-1.5">
                  Natural Language Query
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8a29e]" />
                  <input
                    type="text"
                    required
                    value={sandboxQuery}
                    onChange={(e) => setSandboxQuery(e.target.value)}
                    placeholder="Enter test query (e.g. 'What are our revenue growth targets?')"
                    className="w-full rounded-lg bg-[#ffffff] border border-[#d6d3cd] pl-10 pr-4 py-2.5 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-lg bg-[#f8f7f4] border border-[#e5e3dc]">
                <div>
                  <div className="flex justify-between text-xs text-[#57534e] mb-1.5 font-medium">
                    <span>Similarity Cutoff Threshold:</span>
                    <span className="font-mono text-[#1c1917] num-tabular">
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
                    className="w-full accent-[#1c1917] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#57534e] mb-1.5 font-medium">
                    <span>Match Depth Limit (k):</span>
                    <span className="font-mono text-[#1c1917] num-tabular">{matchCount} chunks</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={matchCount}
                    onChange={(e) => setMatchCount(parseInt(e.target.value))}
                    className="w-full accent-[#1c1917] cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sandboxLoading}
                className="flex items-center gap-2 rounded-lg bg-[#1c1917] hover:bg-[#27272a] text-white font-medium px-4 py-2 text-xs shadow-xs transition-all interactive-press disabled:opacity-60"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{sandboxLoading ? 'Executing Cosine Search...' : 'Execute Vector Match'}</span>
              </button>
            </form>
          </div>

          {/* Results Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e3dc] pb-2">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-[#78716c]">
                RETRIEVED VECTOR CANDIDATES ({sandboxResults.length})
              </h3>
            </div>

            {sandboxSearched && sandboxResults.length === 0 && (
              <div className="paper-sheet rounded-xl p-8 text-center text-xs text-[#78716c]">
                No chunks matched the query with threshold {Math.round(matchThreshold * 100)}%. Try
                lowering the threshold cutoff.
              </div>
            )}

            {sandboxResults.map((match, idx) => (
              <div
                key={match.id || idx}
                className="paper-sheet rounded-xl p-5 border border-[#e5e3dc] space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-[#1c1917]">
                    <FileText className="w-4 h-4 text-[#78716c]" />
                    <span>{match.document_title || 'Workspace Document'}</span>
                    {match.source_page && (
                      <span className="stamp-badge">
                        Page {match.source_page}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#f4f3ee] text-[#1c1917] border border-[#e5e3dc] num-tabular">
                      {Math.round(match.similarity * 100)}% SIMILARITY
                    </span>
                    <span className="font-mono text-[10px] text-[#78716c]">RANK №{idx + 1}</span>
                  </div>
                </div>

                <p className="p-3.5 rounded-lg bg-[#f8f7f4] border border-[#e5e3dc] text-xs text-[#27272a] font-mono whitespace-pre-wrap leading-relaxed">
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
