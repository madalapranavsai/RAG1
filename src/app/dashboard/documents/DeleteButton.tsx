"use client";

import { useTransition } from "react";
import { deleteDocument } from "./actions";

interface DeleteButtonProps {
  documentId: string;
  documentTitle: string;
}

export default function DeleteButton({
  documentId,
  documentTitle,
}: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete "${documentTitle}"? This will permanently delete the file and all its searchable vector chunks.`
      )
    ) {
      startTransition(async () => {
        const result = await deleteDocument(documentId);
        if (result?.error) {
          alert(`Error deleting document: ${result.error}`);
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center text-xs font-semibold text-error hover:underline disabled:opacity-50 cursor-pointer"
    >
      {isPending ? (
        <span className="flex items-center gap-1">
          <svg
            className="animate-spin h-3.5 w-3.5 text-error"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Deleting...
        </span>
      ) : (
        "Delete"
      )}
    </button>
  );
}
