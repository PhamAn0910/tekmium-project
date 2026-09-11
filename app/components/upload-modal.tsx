"use client";

import { useState, useRef, useCallback } from "react";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";

interface UploadResult {
  fileName: string;
  chunksProcessed: number;
  vectorsUpserted: number;
}

export function UploadModal({ open, onClose, onUploadComplete }: UploadModalProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setState("idle");
    setError(null);
    setResult(null);
    setDragOver(false);
  }, []);

  function handleClose() {
    if (state === "uploading") return;
    resetState();
    onClose();
  }

  async function uploadFile(file: File) {
    setState("uploading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      setResult({
        fileName: data.fileName,
        chunksProcessed: data.chunksProcessed,
        vectorsUpserted: data.vectorsUpserted,
      });
      setState("success");
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setState("error");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-on-surface">
            Upload Document
          </h2>
          <button
            onClick={handleClose}
            disabled={state === "uploading"}
            className="flex items-center justify-center rounded-md p-1 text-outline hover:bg-surface-container hover:text-on-surface disabled:opacity-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Idle / Error — Drop zone */}
        {(state === "idle" || state === "error") && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragOver
                  ? "border-primary bg-primary-fixed/20"
                  : "border-outline-variant bg-surface-container-low hover:border-primary/50 hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-[32px] text-outline">
                upload_file
              </span>
              <div className="text-center">
                <p className="text-sm font-medium text-on-surface">
                  Drop a file here or click to browse
                </p>
                <p className="mt-1 text-xs text-outline">
                  .txt or .md files up to 500KB
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />
            {state === "error" && error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-error/30 bg-error-container/20 px-3 py-2">
                <span className="material-symbols-outlined text-[16px] text-on-error-container">
                  error
                </span>
                <span className="text-xs font-medium text-on-error-container">
                  {error}
                </span>
              </div>
            )}
          </>
        )}

        {/* Uploading */}
        {state === "uploading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
            <p className="text-sm font-medium text-on-surface">
              Processing document...
            </p>
            <p className="text-xs text-outline">
              Chunking, embedding, and indexing
            </p>
          </div>
        )}

        {/* Success */}
        {state === "success" && result && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <span className="material-symbols-outlined text-[24px] text-emerald-600">
                check_circle
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-on-surface">
                Upload successful!
              </p>
              <p className="mt-1 text-xs text-outline">
                {result.fileName}
              </p>
            </div>
            <div className="mt-1 flex gap-4 text-xs text-on-surface-variant">
              <span>
                <strong className="font-mono">{result.chunksProcessed}</strong> chunks
              </span>
              <span>
                <strong className="font-mono">{result.vectorsUpserted}</strong> vectors
              </span>
            </div>
            <button
              onClick={handleClose}
              className="mt-3 rounded-lg bg-primary-container px-5 py-2 text-xs font-medium text-on-primary transition-colors hover:bg-secondary"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
