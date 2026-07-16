export default function ChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Chat Base
        </h1>
        <p className="mt-1 text-sm text-muted-text">
          Ask questions over your indexed knowledge. (Active in Phase 7)
        </p>
      </div>
      <div className="h-64 rounded-xl border border-dashed border-border-custom bg-surface flex items-center justify-center text-muted-text">
        Vector-scoped RAG QA interface will be implemented in Phase 7.
      </div>
    </div>
  );
}
