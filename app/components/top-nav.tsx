"use client";

import { useEffect, useState } from "react";

interface TopNavProps {
  onUploadClick?: () => void;
  refreshKey?: number;
}

export function TopNav({ onUploadClick, refreshKey }: TopNavProps) {
  const [vectorCount, setVectorCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => setVectorCount(typeof data.totalVectors === "number" ? data.totalVectors : null))
      .catch(() => setVectorCount(null));
  }, [refreshKey]);

  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-6 sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
          <span className="text-base font-bold tracking-tight text-on-surface">
            Tekmium RAG
          </span>
        </div>
        <span className="rounded-sm border border-outline-variant bg-surface-container-lowest px-1.5 py-0.5 font-mono text-[11px] font-medium leading-[14px] tracking-[0.02em] text-on-surface-variant">
          v1.0
        </span>
      </div>

      {/* Actions + Status */}
      <div className="flex items-center gap-3">
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary/50 hover:bg-surface-container hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            <span>Upload</span>
          </button>
        )}
        {vectorCount !== null && (
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-medium leading-4 tracking-[0.01em] text-on-surface-variant">
              Knowledge base: {vectorCount.toLocaleString()} chunks indexed
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
