"use client";

import React, { useState, useTransition } from "react";
import { testRetrieval, RetrievedChunk } from "@/app/dashboard/documents/retrievalAction";

export default function RetrievalSandbox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RetrievedChunk[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setError(null);
    startTransition(async () => {
      const response = await testRetrieval(trimmedQuery);
      if (response.error) {
        setError(response.error);
        setResults([]);
      } else if (response.chunks) {
        setResults(response.chunks);
      }
    });
  };

  return (
    <div className="rounded-xl border border-border-custom bg-surface shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border-custom bg-background/30 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground text-sm">
            Retrieval Sandbox
          </h3>
          <p className="text-xs text-muted-text mt-0.5">
            Test and audit your vector search similarity outputs.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/20">
          pgvector Debugger
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isPending}
            placeholder="Type a test query (e.g. 'What is the refund policy?')..."
            className="flex-1 rounded-lg border border-border-custom bg-background px-3.5 py-2 text-sm text-foreground placeholder-muted-text shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Searching...
              </span>
            ) : (
              "Query Vector"
            )}
          </button>
        </form>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-error/10 border border-error/20 p-3.5 text-xs text-error font-medium">
            {error}
          </div>
        )}

        {/* Results Container */}
        {results !== null && (
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-text uppercase tracking-wider">
              Search Results ({results.length})
            </h4>

            {results.length === 0 ? (
              <div className="rounded-lg border border-border-custom bg-background p-6 text-center text-sm text-muted-text">
                No matching chunks found. Try modifying your query or uploading more document files.
              </div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {results.map((chunk, idx) => (
                  <div
                    key={chunk.id}
                    className="rounded-xl border border-border-custom bg-background p-4 shadow-xs space-y-2 hover:border-primary/30 transition-all"
                  >
                    {/* Header: Title, similarity match percent */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-semibold text-foreground truncate max-w-[180px]">
                          {chunk.document_title}
                        </span>
                        {chunk.source_page && (
                          <span className="text-muted-text text-[10px]">
                            (Page {chunk.source_page})
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-800 border border-zinc-200">
                        Rank {idx + 1} • {(chunk.similarity * 100).toFixed(0)}% Match
                      </span>
                    </div>

                    {/* Content snippet */}
                    <p className="text-sm leading-relaxed text-foreground bg-surface border border-border-custom/50 rounded-lg p-3 font-mono text-xs whitespace-pre-wrap select-text selection:bg-primary/20">
                      {chunk.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
