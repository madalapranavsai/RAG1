"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { sendChatMessage } from "@/app/dashboard/chat/actions";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  retrieved_chunk_ids?: string[] | null;
  created_at: string;
}

interface ChatInterfaceProps {
  chatId: string;
  initialMessages: Message[];
  citations: Record<string, { content: string; docTitle: string }>;
}

export default function ChatInterface({
  chatId,
  initialMessages,
  citations,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [openCitations, setOpenCitations] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state when initialMessages change
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, chatId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  // Parse message content to extract suggested follow-up questions
  const parseMessage = (content: string) => {
    const separator = "Follow-up Questions:";
    const idx = content.indexOf(separator);
    if (idx === -1) {
      return { text: content, questions: [] as string[] };
    }

    const text = content.slice(0, idx).trim();
    const questionsBlock = content.slice(idx + separator.length).trim();
    const questions: string[] = [];

    // Parse numbering list items like "1. Question?"
    const lines = questionsBlock.split("\n");
    lines.forEach((line) => {
      const cleanLine = line.replace(/^\d+\.\s*/, "").trim();
      if (cleanLine) {
        questions.push(cleanLine);
      }
    });

    return { text, questions };
  };

  // Submit search query
  const submitQuery = (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isPending) return;

    // Optimistically push user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    startTransition(async () => {
      const response = await sendChatMessage(chatId, trimmed);
      if (response.error) {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ Failed to get reply: ${response.error}`,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuery(input);
  };

  // Toggle citations accordion visibility
  const toggleCitations = (msgId: string) => {
    setOpenCitations((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Extract follow-up questions for the latest message if it's from the assistant
  const latestMessage = messages[messages.length - 1];
  const latestParsed =
    latestMessage && latestMessage.role === "assistant"
      ? parseMessage(latestMessage.content)
      : { text: "", questions: [] };

  return (
    <div className="flex flex-col h-[600px] border border-border-custom bg-surface rounded-xl shadow-sm overflow-hidden">
      {/* Thread Header */}
      <div className="px-6 py-4 border-b border-border-custom bg-background/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <h2 className="font-semibold text-foreground text-sm">Active Session</h2>
        </div>
        <span className="text-[10px] text-muted-text font-mono">
          ID: {chatId.slice(0, 8)}...
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background/5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 p-8">
            <div className="p-3 bg-primary/10 rounded-full border border-primary/20 text-primary animate-pulse">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground">Workspace RAG Sandbox</p>
            <p className="text-xs text-muted-text max-w-sm">
              Ask a question! The system will retrieve matching vector segments from your uploaded documents and answer using the LLM.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === "user";
            const parsed = isUser ? { text: msg.content, questions: [] } : parseMessage(msg.content);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                    isUser
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-surface border border-border-custom text-foreground rounded-bl-none font-sans"
                  }`}
                >
                  {/* Clean message text (stripped of follow-up questions) */}
                  <p className="whitespace-pre-wrap leading-relaxed select-text">
                    {parsed.text}
                  </p>
                  <span
                    className={`block text-[9px] mt-1.5 text-right ${
                      isUser ? "text-white/60" : "text-muted-text"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Assistant Source Citations Accordion */}
                {!isUser && msg.retrieved_chunk_ids && msg.retrieved_chunk_ids.length > 0 && (
                  <div className="w-[75%] pl-1 text-xs">
                    <button
                      onClick={() => toggleCitations(msg.id)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <svg
                        className={`h-3 w-3 transition-transform duration-200 ${
                          openCitations[msg.id] ? "rotate-90" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                      Sources Used ({msg.retrieved_chunk_ids.length})
                    </button>

                    {openCitations[msg.id] && (
                      <div className="mt-2 space-y-2 border-l-2 border-primary/20 pl-3 py-1">
                        {msg.retrieved_chunk_ids.map((chunkId) => {
                          const resolved = citations[chunkId];
                          if (!resolved) return null;
                          return (
                            <div
                              key={chunkId}
                              className="rounded-lg border border-border-custom bg-background p-2.5 shadow-xs space-y-1"
                            >
                              <span className="font-semibold text-foreground text-[10px] block truncate">
                                📄 {resolved.docTitle}
                              </span>
                              <p className="text-[10px] text-muted-text font-mono whitespace-pre-wrap leading-relaxed line-clamp-3 select-text bg-surface p-1.5 rounded border border-border-custom/50">
                                {resolved.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isPending && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border-custom text-foreground rounded-2xl rounded-bl-none px-4 py-3 shadow-xs space-y-1">
              <span className="text-[10px] text-primary font-semibold tracking-wider uppercase block">
                DocuMind RAG
              </span>
              <div className="flex items-center gap-1.5 py-1">
                <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {/* Suggestion Follow-up Buttons (only displayed below the latest AI message) */}
        {!isPending && latestParsed.questions.length > 0 && (
          <div className="flex flex-col items-start gap-2 pl-2 mt-4 animate-fade-in">
            <span className="text-[9px] font-semibold text-muted-text uppercase tracking-wider">
              Suggested Follow-up
            </span>
            <div className="flex flex-wrap gap-2">
              {latestParsed.questions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => submitQuery(q)}
                  disabled={isPending}
                  className="rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 transition-all text-left shadow-xs hover:border-primary/40 disabled:opacity-50 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <div className="p-4 border-t border-border-custom bg-background/20">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isPending}
            placeholder="Ask a question about your documents..."
            className="flex-1 rounded-lg border border-border-custom bg-background px-3.5 py-2 text-sm text-foreground placeholder-muted-text shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
