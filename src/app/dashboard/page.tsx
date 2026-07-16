import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get active workspace
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);

  const activeWorkspaceId = memberships?.[0]?.workspace_id;

  let docCount = 0;
  let readyDocCount = 0;
  let processingDocCount = 0;
  let chatCount = 0;

  if (activeWorkspaceId) {
    // Fetch document counts
    const { data: docs } = await supabase
      .from("documents")
      .select("status")
      .eq("workspace_id", activeWorkspaceId);

    if (docs) {
      docCount = docs.length;
      readyDocCount = docs.filter((d) => d.status === "ready").length;
      processingDocCount = docs.filter(
        (d) => d.status === "processing" || d.status === "uploaded"
      ).length;
    }

    // Fetch total chats
    const { count: chats } = await supabase
      .from("chats")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", activeWorkspaceId);

    chatCount = chats || 0;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome to your workspace
        </h1>
        <p className="mt-1.5 text-sm text-muted-text">
          Upload documents and query them inside your isolated tenant environment.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-border-custom bg-surface p-6 shadow-sm transition-all hover:border-primary/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-text">
            Total Documents
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">{docCount}</p>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-border-custom bg-surface p-6 shadow-sm transition-all hover:border-primary/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-text">
            Ready Documents
          </p>
          <p className="mt-2 text-3xl font-bold text-success">{readyDocCount}</p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-border-custom bg-surface p-6 shadow-sm transition-all hover:border-primary/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-text">
            Processing Jobs
          </p>
          <p className="mt-2 text-3xl font-bold text-primary">
            {processingDocCount}
          </p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-border-custom bg-surface p-6 shadow-sm transition-all hover:border-primary/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-text">
            Total Chats
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">{chatCount}</p>
        </div>
      </div>

      {/* Onboarding Empty State */}
      {docCount === 0 && (
        <div className="rounded-2xl border border-dashed border-border-custom bg-surface p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary">
            <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            No documents indexed
          </h3>
          <p className="mt-2 text-sm text-muted-text max-w-sm mx-auto">
            Get started by uploading PDFs, Markdown, or text files in the Documents dashboard to train your assistant.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/dashboard/documents"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer"
            >
              Upload a Document
            </Link>
            <Link
              href="/dashboard/chat"
              className="inline-flex items-center justify-center rounded-lg border border-border-custom bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-zinc-50 transition-all cursor-pointer"
            >
              Start Chatting
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
