export default function UsagePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Usage Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-text">
          Track RAG queries, uploads, and model usage tokens. (Active in Phase 8)
        </p>
      </div>
      <div className="h-64 rounded-xl border border-dashed border-border-custom bg-surface flex items-center justify-center text-muted-text">
        Usage dashboard and metrics charts will be implemented in Phase 8.
      </div>
    </div>
  );
}
