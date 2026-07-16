import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground font-sans">
      <main className="w-full max-w-2xl rounded-2xl bg-surface border border-border-custom p-8 shadow-sm transition-all md:p-12">
        <div className="flex flex-col gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              DocuMind RAG SaaS
            </h1>
          </div>
          
          <p className="text-lg leading-relaxed text-muted-text">
            A secure, multi-tenant Retrieval-Augmented Generation dashboard. Upload documents, query your private knowledge base, and explore citation-backed answers with strict tenant isolation.
          </p>

          <div className="h-px bg-border-custom my-4" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border-custom bg-background p-5 hover:border-primary transition-all">
              <h3 className="font-semibold text-foreground">Phase 0 Status</h3>
              <p className="mt-1 text-sm text-muted-text">
                Scaffolding: Complete<br />
                Tailwind CSS: Active<br />
                Database: pgvector initialized
              </p>
            </div>
            
            <div className="rounded-xl border border-border-custom bg-background p-5 hover:border-primary transition-all">
              <h3 className="font-semibold text-foreground">Navigation Ready</h3>
              <p className="mt-1 text-sm text-muted-text">
                Dashboard & auth routes will be established in Phase 1.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
            <div className="text-center sm:text-left w-full sm:w-auto">
              <span className="inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success border border-success/20">
                Ready for Development
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

