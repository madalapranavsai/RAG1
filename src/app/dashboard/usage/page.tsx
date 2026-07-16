import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

interface UsageEvent {
  id: string;
  event_type: string;
  quantity: number;
  metadata: any;
  created_at: string;
}

const LIMITS = {
  document_uploaded: 10,
  chunk_created: 500,
  token_used: 100000,
};

export default async function UsagePage() {
  const supabase = await createClient();

  // 1. Authenticate user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch user's active workspace memberships
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);

  const activeWorkspaceId = memberships?.[0]?.workspace_id;

  if (!activeWorkspaceId) {
    redirect("/dashboard");
  }

  // 3. Fetch all usage events in active workspace
  const { data: eventsRaw } = await supabase
    .from("usage_events")
    .select("id, event_type, quantity, metadata, created_at")
    .eq("workspace_id", activeWorkspaceId)
    .order("created_at", { ascending: false });

  const events: UsageEvent[] = eventsRaw || [];

  // 4. Aggregate metric counts
  const usage = {
    document_uploaded: 0,
    chunk_created: 0,
    token_used: 0,
  };

  events.forEach((e) => {
    if (e.event_type === "document_uploaded") {
      usage.document_uploaded += e.quantity;
    } else if (e.event_type === "chunk_created") {
      usage.chunk_created += e.quantity;
    } else if (e.event_type === "token_used") {
      usage.token_used += e.quantity;
    }
  });

  // Calculate percentages
  const uploadsPct = Math.min(100, Math.round((usage.document_uploaded / LIMITS.document_uploaded) * 100));
  const chunksPct = Math.min(100, Math.round((usage.chunk_created / LIMITS.chunk_created) * 100));
  const tokensPct = Math.min(100, Math.round((usage.token_used / LIMITS.token_used) * 100));

  // Helper to determine progress bar color
  const getProgressColor = (pct: number) => {
    if (pct >= 90) return "bg-error";
    if (pct >= 70) return "bg-warning";
    return "bg-primary";
  };

  // Helper to translate event types to display names
  const getEventName = (type: string) => {
    switch (type) {
      case "document_uploaded":
        return "Document Upload";
      case "chunk_created":
        return "Text Chunking";
      case "token_used":
        return "LLM Inference";
      default:
        return type;
    }
  };

  // Helper to format metadata details
  const getMetadataSummary = (event: UsageEvent) => {
    const meta = event.metadata || {};
    if (event.event_type === "document_uploaded") {
      return meta.filename ? `Uploaded file: ${meta.filename}` : "File upload";
    }
    if (event.event_type === "chunk_created") {
      return meta.document_id ? `Generated text chunks` : "Parsing chunks";
    }
    if (event.event_type === "token_used") {
      const type = meta.type || "inference";
      return `Model transaction (${type})`;
    }
    return "-";
  };

  return (
    <div className="space-y-8">
      {/* Page Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Usage Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-text">
          Track RAG queries, uploads, and model usage tokens in your active workspace.
        </p>
      </div>

      {/* Subscription Status Card */}
      <div className="rounded-xl border border-border-custom bg-surface p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
            Active Subscription
          </span>
          <h2 className="text-lg font-bold text-foreground mt-1">Free Developer Sandbox</h2>
          <p className="text-xs text-muted-text">
            Complimentary tier for prototyping and evaluation. Upgrade for custom model routing and higher storage volumes.
          </p>
        </div>
        <button className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 transition-all cursor-pointer">
          Upgrade Plan
        </button>
      </div>

      {/* Limit Progress Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Uploads limit */}
        <div className="rounded-xl border border-border-custom bg-surface p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-muted-text">Upload Capacity</span>
            <span className="font-semibold text-foreground">
              {usage.document_uploaded} / {LIMITS.document_uploaded} files
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2 border border-border-custom overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${getProgressColor(
                uploadsPct
              )}`}
              style={{ width: `${uploadsPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-text">
            <span>{uploadsPct}% Consumed</span>
            <span>{LIMITS.document_uploaded - usage.document_uploaded} remaining</span>
          </div>
        </div>

        {/* Chunks limit */}
        <div className="rounded-xl border border-border-custom bg-surface p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-muted-text">Vector Chunk Limit</span>
            <span className="font-semibold text-foreground">
              {usage.chunk_created} / {LIMITS.chunk_created} chunks
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2 border border-border-custom overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${getProgressColor(
                chunksPct
              )}`}
              style={{ width: `${chunksPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-text">
            <span>{chunksPct}% Consumed</span>
            <span>{LIMITS.chunk_created - usage.chunk_created} remaining</span>
          </div>
        </div>

        {/* Tokens limit */}
        <div className="rounded-xl border border-border-custom bg-surface p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-muted-text">LLM Context Tokens</span>
            <span className="font-semibold text-foreground">
              {usage.token_used.toLocaleString()} / {LIMITS.token_used.toLocaleString()} tokens
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2 border border-border-custom overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${getProgressColor(
                tokensPct
              )}`}
              style={{ width: `${tokensPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-text">
            <span>{tokensPct}% Consumed</span>
            <span>{(LIMITS.token_used - usage.token_used).toLocaleString()} remaining</span>
          </div>
        </div>
      </div>

      {/* Usage Transaction Log Table */}
      <div className="rounded-xl border border-border-custom bg-surface shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-custom bg-background/30">
          <h3 className="font-semibold text-foreground text-sm">Recent Transactions</h3>
          <p className="text-xs text-muted-text mt-0.5">
            Audit history of API calls, vector ingestions, and storage events.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-text bg-surface">
            No transaction records found in this workspace. Upload files to generate usage data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-background/50 border-b border-border-custom text-muted-text font-semibold">
                  <th className="px-6 py-3">Event Type</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50">
                {events.slice(0, 20).map((ev) => (
                  <tr key={ev.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-foreground">
                      {getEventName(ev.event_type)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-foreground">
                      +{ev.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-muted-text">
                      {getMetadataSummary(ev)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-muted-text">
                      {new Date(ev.created_at).toLocaleString()}
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
}
