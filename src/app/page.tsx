import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground font-sans relative overflow-hidden">
      {/* Background visual gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-success/5 rounded-full blur-3xl -z-10 translate-x-1/2 translate-y-1/2" />

      <main className="w-full max-w-2xl rounded-2xl bg-surface border border-border-custom p-8 shadow-sm transition-all md:p-12 relative">
        <div className="flex flex-col gap-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse" />
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              DocuMind RAG
            </h1>
          </div>
          
          <p className="text-base leading-relaxed text-muted-text max-w-xl mx-auto">
            A high-performance, multi-tenant Retrieval-Augmented Generation (RAG) platform. Upload files, partition and search semantic vectors securely, and chat with your knowledge base.
          </p>

          <div className="h-px bg-border-custom my-4" />

          {/* Core features grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
            <div className="rounded-xl border border-border-custom bg-background p-5 hover:border-primary/50 transition-all">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                🛡️ Multi-Tenant Isolation
              </h3>
              <p className="mt-1 text-xs text-muted-text leading-relaxed">
                Access scopes are guarded by active Supabase Row Level Security (RLS) tables and private storage rules.
              </p>
            </div>
            
            <div className="rounded-xl border border-border-custom bg-background p-5 hover:border-primary/50 transition-all">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                ⚡ Local ONNX Embeddings
              </h3>
              <p className="mt-1 text-xs text-muted-text leading-relaxed">
                Parse PDFs, Markdown, and TXT files instantly on the server using cached Transformers.js pipelines.
              </p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background p-5 hover:border-primary/50 transition-all">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                💬 Citation-Backed Chat
              </h3>
              <p className="mt-1 text-xs text-muted-text leading-relaxed">
                Query document data in threads offering ranks matches, similarity margins, and click-to-submit suggestions.
              </p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background p-5 hover:border-primary/50 transition-all">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                📊 Usage Telemetry
              </h3>
              <p className="mt-1 text-xs text-muted-text leading-relaxed">
                Monitor workspace event counters, token inference transactions, and storage limitations.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-border-custom bg-background px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-zinc-50 transition-all cursor-pointer"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

