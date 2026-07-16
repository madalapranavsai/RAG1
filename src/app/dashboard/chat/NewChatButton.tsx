"use client";

import React, { useTransition } from "react";
import { createChatSession } from "./actions";
import { useRouter } from "next/navigation";

export default function NewChatButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = () => {
    startTransition(async () => {
      const res = await createChatSession();
      if (res.error) {
        alert(res.error);
      } else if (res.chatId) {
        router.push(`/dashboard/chat?id=${res.chatId}`);
      }
    });
  };

  return (
    <button
      onClick={handleCreate}
      disabled={isPending}
      className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
    >
      {isPending ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Initializing...
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Conversation
        </span>
      )}
    </button>
  );
}
