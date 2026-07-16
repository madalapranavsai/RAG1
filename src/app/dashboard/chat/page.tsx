import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import NewChatButton from "./NewChatButton";
import DeleteChatButton from "./DeleteChatButton";
import ChatInterface from "@/components/ChatInterface";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  retrieved_chunk_ids?: string[] | null;
  created_at: string;
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
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

  // 3. Fetch past chat sessions under the active workspace
  const { data: chatSessionsRaw } = await supabase
    .from("chats")
    .select("id, title, created_at")
    .eq("workspace_id", activeWorkspaceId)
    .order("created_at", { ascending: false });

  const chatSessions: ChatSession[] = chatSessionsRaw || [];

  // 4. Resolve selected chat session ID from search query params
  const { id: activeChatId } = await searchParams;

  // 5. Fetch message thread history if activeChatId is valid
  let activeMessages: Message[] = [];
  let citations: Record<string, { content: string; docTitle: string }> = {};

  if (activeChatId) {
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("id, role, content, retrieved_chunk_ids, created_at")
      .eq("chat_id", activeChatId)
      .order("created_at", { ascending: true });

    activeMessages = (messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      retrieved_chunk_ids: m.retrieved_chunk_ids,
      created_at: m.created_at,
    }));

    // Resolve citations in a single batch query
    const chunkIds = Array.from(
      new Set(activeMessages.flatMap((m) => m.retrieved_chunk_ids || []))
    );

    if (chunkIds.length > 0) {
      const { data: chunks } = await supabase
        .from("document_chunks")
        .select("id, content, documents (title)")
        .in("id", chunkIds);

      chunks?.forEach((c: any) => {
        citations[c.id] = {
          content: c.content,
          docTitle: c.documents?.title || "Unknown Document",
        };
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Chat Base
        </h1>
        <p className="mt-1 text-sm text-muted-text">
          Ask questions over your workspace documents using vector-based RAG.
        </p>
      </div>

      {/* Main dual-pane layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Chat History Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-border-custom bg-surface p-4 shadow-sm space-y-4 flex flex-col max-h-[600px]">
            <NewChatButton />

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[480px]">
              <h3 className="text-[10px] font-semibold text-muted-text uppercase tracking-wider px-2.5 mb-2">
                Conversations
              </h3>

              {chatSessions.length === 0 ? (
                <p className="text-xs text-muted-text text-center py-6 px-3">
                  No active chats. Start one above!
                </p>
              ) : (
                chatSessions.map((chat) => {
                  const isActive = chat.id === activeChatId;
                  return (
                    <div
                      key={chat.id}
                      className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-all border ${
                        isActive
                          ? "bg-primary/10 text-primary border-primary/20 font-semibold"
                          : "hover:bg-zinc-50/50 border-transparent text-foreground"
                      }`}
                    >
                      <Link
                        href={`/dashboard/chat?id=${chat.id}`}
                        className="flex-1 min-w-0 pr-2 truncate block"
                      >
                        {chat.title}
                      </Link>
                      <DeleteChatButton chatId={chat.id} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Chat Thread Viewport */}
        <div className="lg:col-span-3">
          {activeChatId ? (
            <ChatInterface
              chatId={activeChatId}
              initialMessages={activeMessages}
              citations={citations}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12 h-[600px] border border-dashed border-border-custom bg-surface rounded-xl text-muted-text">
              <svg
                className="h-10 w-10 text-muted-text/60 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="font-semibold text-foreground text-sm">
                No Chat Selected
              </h3>
              <p className="text-xs max-w-xs mt-1">
                Select an existing conversation from the sidebar or click "New
                Conversation" to start.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
