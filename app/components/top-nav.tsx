"use client";

import { useEffect, useState } from "react";

export function TopNav() {
  const [vectorCount, setVectorCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setVectorCount(data.totalVectors))
      .catch(() => setVectorCount(null));
  }, []);

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

      {/* Status */}
      <div className="flex items-center gap-3">
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
