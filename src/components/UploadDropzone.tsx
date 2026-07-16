"use client";

import React, { useState, useRef, useTransition } from "react";
import { uploadDocument } from "@/app/dashboard/documents/actions";

interface UploadDropzoneProps {
  onSuccess?: () => void;
}

export default function UploadDropzone({ onSuccess }: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    setSuccess(false);

    const allowedMimeTypes = [
      "application/pdf",
      "text/plain",
      "text/markdown",
    ];
    const maxFileSize = 2 * 1024 * 1024; // 2MB

    if (!allowedMimeTypes.includes(selectedFile.type)) {
      setError("Unsupported file format. Please upload PDF, TXT, or Markdown.");
      setFile(null);
      return false;
    }

    if (selectedFile.size > maxFileSize) {
      setError("File is too large. Maximum size is 2MB.");
      setFile(null);
      return false;
    }

    setFile(selectedFile);
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);

      // Call server action
      const result = await uploadDocument(null, formData);

      if (result.error) {
        setError(result.error);
        setSuccess(false);
      } else {
        setSuccess(true);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onSuccess?.();
      }
    });
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className={`w-full rounded-2xl border-2 border-dashed p-10 text-center shadow-sm cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border-custom bg-surface hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isPending}
        />

        {/* Icon / Status representation */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary mb-4">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {file ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground truncate max-w-xs">
              {file.name}
            </p>
            <p className="text-xs text-muted-text">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">
              Drag & drop your document here
            </p>
            <p className="text-xs text-muted-text">
              or click to browse your files
            </p>
            <p className="text-[10px] text-muted-text/70 mt-1">
              Supports PDF, TXT, and Markdown (Max 2MB)
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons & Feedback */}
      {file && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={isPending}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Uploading file..." : "Confirm Upload"}
          </button>
          <button
            onClick={() => setFile(null)}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-lg border border-border-custom bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-zinc-50 transition-all disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-error/10 border border-error/20 p-3.5 text-xs text-error font-medium flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-success/10 border border-success/20 p-3.5 text-xs text-success font-medium flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Document uploaded successfully! Ingestion will begin shortly.
        </div>
      )}
    </div>
  );
}
