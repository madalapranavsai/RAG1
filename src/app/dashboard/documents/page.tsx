import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import UploadDropzone from "@/components/UploadDropzone";
import DeleteButton from "./DeleteButton";

export default async function DocumentsPage() {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch user's active workspace
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);

  const activeWorkspaceId = memberships?.[0]?.workspace_id;

  if (!activeWorkspaceId) {
    return (
      <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm text-error">
        No active workspace detected. Please log out and sign in again.
      </div>
    );
  }

  // 3. Fetch documents with their chunk counts
  const { data: documents, error } = await supabase
    .from("documents")
    .select("*, document_chunks(count)")
    .eq("workspace_id", activeWorkspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error);
  }

  // Helper to render file icons
  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") {
      return (
        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Documents
        </h1>
        <p className="mt-1.5 text-sm text-muted-text">
          Upload PDFs, Markdown, and text files to build your knowledge base.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Document List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border-custom bg-surface shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border-custom">
              <h3 className="font-semibold text-foreground text-sm">
                Workspace Files
              </h3>
            </div>

            {!documents || documents.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-text">
                No documents uploaded yet. Use the control panel to add files.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom bg-background/50 text-xs font-semibold text-muted-text uppercase tracking-wider">
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Chunks</th>
                      <th className="px-6 py-3">Upload Date</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom text-sm text-foreground">
                    {documents.map((doc) => {
                      // Retrieve the chunk count from the subquery relation
                      const countArray = doc.document_chunks as unknown as { count: number }[] | null;
                      const chunkCount = countArray?.[0]?.count ?? 0;

                      return (
                        <tr
                          key={doc.id}
                          className="hover:bg-zinc-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 flex items-center gap-3">
                            {getFileIcon(doc.mime_type || "")}
                            <span className="font-medium text-foreground truncate max-w-[200px]" title={doc.title}>
                              {doc.title}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                doc.status === "ready"
                                  ? "bg-success/10 text-success border-success/20"
                                  : doc.status === "processing"
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : doc.status === "failed"
                                  ? "bg-error/10 text-error border-error/20"
                                  : "bg-zinc-100 text-zinc-800 border-zinc-200"
                              }`}
                            >
                              {doc.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-text">
                            {chunkCount}
                          </td>
                          <td className="px-6 py-4 text-muted-text">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DeleteButton
                              documentId={doc.id}
                              documentTitle={doc.title}
                            />
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

        {/* Upload Control Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border-custom bg-surface p-6 shadow-sm">
            <h3 className="font-semibold text-foreground text-sm mb-4">
              Add Knowledge File
            </h3>
            <UploadDropzone />
          </div>
        </div>
      </div>
    </div>
  );
}
