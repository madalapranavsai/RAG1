"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { generateEmbedding } from "@/utils/embeddings";
import { generateChatCompletion } from "@/utils/llm";

/**
 * Creates a new chat session under the active workspace.
 */
export async function createChatSession() {
  try {
    const supabase = await createClient();

    // 1. Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 2. Get active workspace
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id);

    const activeWorkspaceId = memberships?.[0]?.workspace_id;
    if (!activeWorkspaceId) throw new Error("No active workspace");

    // 3. Create chat session
        const { data: chat, error } = await supabase
      .from("chats")
      .insert({
        workspace_id: activeWorkspaceId,
        created_by: user.id,
        title: "New Chat",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/chat");
    return { chatId: chat.id };
  } catch (err: any) {
    console.error("Create chat session error:", err);
    return { error: err.message || "Failed to create chat." };
  }
}

/**
 * Deletes a chat session (cascades to delete all messages in the session).
 */
export async function deleteChatSession(chatId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/chat");
    return { success: true };
  } catch (err: any) {
    console.error("Delete chat session error:", err);
    return { error: err.message || "Failed to delete chat." };
  }
}

/**
 * Sends a message, triggers vector context retrieval, queries the LLM,
 * saves response messages, and writes usage events.
 */
export async function sendChatMessage(chatId: string, content: string) {
  try {
    const trimmedMessage = content.trim();
    if (!trimmedMessage) throw new Error("Message content cannot be empty.");

    const supabase = await createClient();

    // 1. Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 2. Get active workspace
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id);

    const activeWorkspaceId = memberships?.[0]?.workspace_id;
    if (!activeWorkspaceId) throw new Error("No active workspace");

    // 3. Retrieve chat details
    const { data: chat } = await supabase
      .from("chats")
      .select("title")
      .eq("id", chatId)
      .single();

    // 4. Save User Message to Database
    const { error: userMsgError } = await supabase.from("chat_messages").insert({
      chat_id: chatId,
      workspace_id: activeWorkspaceId,
      role: "user",
      content: trimmedMessage,
    });

    if (userMsgError) throw new Error(`Failed to save message: ${userMsgError.message}`);

    // 5. Query Vector Chunks scoped to workspace
    const queryEmbedding = await generateEmbedding(trimmedMessage);
    const { data: matches } = await supabase.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.15,
      match_count: 4,
      filter_workspace_id: activeWorkspaceId,
    });

    // 6. Fetch titles for matches
    const documentIds = Array.from(new Set((matches || []).map((m: any) => m.document_id)));
    const { data: docs } = await supabase
      .from("documents")
      .select("id, title")
      .in("id", documentIds);

    const documentTitleMap = new Map<string, string>();
    docs?.forEach((d) => documentTitleMap.set(d.id, d.title));

    // 7. Synthesize Retrieval Context Block
    let contextBlock = "";
    if (matches && matches.length > 0) {
      contextBlock = matches
        .map((m: any, idx: number) => {
          const docTitle = documentTitleMap.get(m.document_id) || "Unknown File";
          return `--- CONTEXT PART ${idx + 1} (File: ${docTitle}) ---\n${m.content}`;
        })
        .join("\n\n");
    }

    // 8. Load past conversation thread messages (excluding new user message)
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(15);

    const pastMessages = (history || [])
      .filter((m) => m.content !== trimmedMessage)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // 9. Prepare Prompt payload
    const systemInstructions = {
      role: "system" as const,
      content: `You are DocuMind RAG, a professional AI coding and workspace document assistant.
You must answer questions strictly based on the provided Workspace Document Context.
If the context does not contain relevant information to answer, state that you do not know based on the uploaded workspace documents. Do not make up answers.

Workspace Document Context:
${contextBlock || "No relevant documents found in workspace."}

At the very end of your response, on a new line, add exactly two concise suggested follow-up questions that the user might want to ask next based on this conversation. Format it exactly as:
Follow-up Questions:
1. [First Question]
2. [Second Question]
`,
    };

    const completionMessages = [
      systemInstructions,
      ...pastMessages,
      { role: "user" as const, content: trimmedMessage },
    ];

    // 10. Request completions from LLM client
    const completion = await generateChatCompletion(completionMessages);

    // 11. Write Assistant Reply to Database
    const chunkIds = matches ? matches.map((m: any) => m.id) : [];
    const { error: assistantMsgError } = await supabase.from("chat_messages").insert({
      chat_id: chatId,
      workspace_id: activeWorkspaceId,
      role: "assistant",
      content: completion.content,
      retrieved_chunk_ids: chunkIds,
    });

    if (assistantMsgError) throw new Error(`Failed to save AI reply: ${assistantMsgError.message}`);

    // 12. Update chat title if it's currently "New Chat"
    if (chat && chat.title === "New Chat") {
      const generatedTitle =
        trimmedMessage.length > 40
          ? `${trimmedMessage.slice(0, 37)}...`
          : trimmedMessage;
      await supabase
        .from("chats")
        .update({ title: generatedTitle })
        .eq("id", chatId);
    }

    // 13. Log Token Usage events
    if (completion.usage) {
      await supabase.from("usage_events").insert([
        {
          workspace_id: activeWorkspaceId,
          event_type: "token_used",
          quantity: completion.usage.prompt_tokens,
          metadata: { type: "prompt", chatId },
        },
        {
          workspace_id: activeWorkspaceId,
          event_type: "token_used",
          quantity: completion.usage.completion_tokens,
          metadata: { type: "completion", chatId },
        },
      ]);
    }

    revalidatePath("/dashboard/chat");
    return { success: true };
  } catch (err: any) {
    console.error("Error sending chat message:", err);
    return { error: err.message || "An unexpected chat error occurred." };
  }
}
