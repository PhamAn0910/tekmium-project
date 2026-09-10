"use client";

import { useRef, useEffect } from "react";

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function QueryInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: QueryInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && value.trim() && !isLoading) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-[0_-4px_12px_-2px_rgba(15,23,42,0.04)]">
      <div className="mx-auto max-w-4xl space-y-2">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim() && !isLoading) onSubmit();
          }}
        >
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
              <span className="material-symbols-outlined text-[20px]">
                search
              </span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the knowledge base..."
              disabled={isLoading}
              className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-10 pr-24 text-sm leading-[22px] text-on-surface placeholder:text-outline focus:border-primary-container focus:ring-1 focus:ring-primary-container focus:outline-none disabled:opacity-60 transition-all"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <kbd className="rounded border border-outline-variant bg-canvas px-1.5 py-0.5 font-mono text-[11px] font-medium leading-[14px] text-outline">
                Enter ↵
              </kbd>
            </div>
          </div>
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary-container px-5 text-xs font-medium leading-4 tracking-[0.01em] text-on-primary transition-colors duration-150 ease-linear hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Ask</span>
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </form>

        <div className="flex items-center justify-between px-1 text-[11px] leading-tight text-outline">
          <div className="flex items-center gap-2">
            <span>
              Retrieval: <strong className="font-medium text-on-surface">Vector Dense (cosine)</strong>
            </span>
            <span className="text-outline-variant">&middot;</span>
            <span>
              Top-k: <strong className="font-mono text-on-surface">5 chunks</strong>
            </span>
          </div>
          <span className="font-mono text-[11px]">
            Press Enter ↵ to ask
          </span>
        </div>
      </div>
    </footer>
  );
}
