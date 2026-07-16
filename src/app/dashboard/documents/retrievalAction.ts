"use server";

import { createClient } from "@/utils/supabase/server";
import { generateEmbedding } from "@/utils/embeddings";

export interface RetrievedChunk {
  id: string;
  document_id: string;
  document_title: string;
  content: string;
  source_page: number | null;
  source_label: string | null;
  similarity: number;
}

/**
 * Embedded search query similarity vector matches.
 * Scoped strictly to the active workspace.
 *
 * @param query Natural language user query.
 * @returns List of chunks with similarity scores.
 */
export async function testRetrieval(query: string): Promise<{
  chunks?: RetrievedChunk[];
  error?: string;
}> {
  try {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { chunks: [] };
    }

    const supabase = await createClient();

    // 1. Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in to perform searches." };
    }

    // 2. Fetch active workspace
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id);

    const activeWorkspaceId = memberships?.[0]?.workspace_id;

    if (!activeWorkspaceId) {
      return { error: "No active workspace found for your account." };
    }

    // 3. Generate embedding for query text
    const queryEmbedding = await generateEmbedding(trimmedQuery);

    // 4. Query postgres similarity matching function via RPC
    const { data: matches, error: rpcError } = await supabase.rpc(
      "match_chunks",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.15, // Low threshold to capture weak matches in development
        match_count: 5,
        filter_workspace_id: activeWorkspaceId,
      }
    );

    if (rpcError) {
      console.error("Vector RPC match error:", rpcError);
      return { error: `Database search failed: ${rpcError.message}` };
    }

    if (!matches || matches.length === 0) {
      return { chunks: [] };
    }

    // 5. Query document records to retrieve names/titles
    const documentIds = Array.from(
      new Set(matches.map((m: any) => m.document_id))
    );
    const { data: docs } = await supabase
      .from("documents")
      .select("id, title")
      .in("id", documentIds);

    const documentTitleMap = new Map<string, string>();
    docs?.forEach((d) => {
      documentTitleMap.set(d.id, d.title);
    });

    // 6. Construct structured return payload
    const chunks: RetrievedChunk[] = matches.map((m: any) => ({
      id: m.id,
      document_id: m.document_id,
      document_title: documentTitleMap.get(m.document_id) || "Unknown Document",
      content: m.content,
      source_page: m.source_page,
      source_label: m.source_label,
      similarity: m.similarity,
    }));

    return { chunks };
  } catch (err: any) {
    console.error("Unhandled retrieval action error:", err);
    return { error: err.message || "An unexpected search error occurred." };
  }
}
