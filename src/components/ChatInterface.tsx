"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { sendChatMessage } from "@/app/dashboard/chat/actions";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  chatId: string;
  initialMessages: Message[];
}

export default function ChatInterface({
  chatId,
  initialMessages,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync messages state when the selected chat session changes
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, chatId]);

  // Scroll to bottom when a new message is appended or when the chat transitions to thinking
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isPending) return;

    // 1. Append the user message optimistically
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedInput,
      created_at: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // 2. Call sendChatMessage Server Action
    startTransition(async () => {
      const response = await sendChatMessage(chatId, trimmedInput);
      if (response.error) {
        // Append error notice in thread
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ Failed to get reply: ${response.error}`,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } else {
        // On success, the server component will revalidate, but we can also manually append
        // the assistant response by checking the latest messages or letting standard Next.js
        // RSC revalidation handle the page-level refresh.
        // To make the UI feel instantaneous and perfectly sync'd, the server revalidation
        // will update initialMessages in the page component. We will let the useEffect sync it.
      }
    });
  };

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
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background/5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 p-8">
            <div className="p-3 bg-primary/10 rounded-full border border-primary/20 text-primary">
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
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                    isUser
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-surface border border-border-custom text-foreground rounded-bl-none font-sans"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed select-text">
                    {msg.content}
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
