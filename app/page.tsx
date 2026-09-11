"use client";

import { useState, useCallback } from "react";
import { TopNav } from "./components/top-nav";
import { QueryInput } from "./components/query-input";
import { EmptyState } from "./components/empty-state";
import { QuestionCard } from "./components/question-card";
import { AnswerCard } from "./components/answer-card";
import { SourceCard } from "./components/source-card";
import { LoadingSkeleton } from "./components/loading-skeleton";
import { UploadModal } from "./components/upload-modal";

interface Source {
  id: string;
  score: number;
  text: string;
  metadata: {
    row_id: number;
    chunk_index: number;
    total_chunks: number;
  };
}

interface RAGResponse {
  query: string;
  answer: string;
  sources: Source[];
  model: string;
  durationMs: number;
}

type AppState = "idle" | "loading" | "result" | "error";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<RAGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSubmit = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const data: RAGResponse = await res.json();
      setResult(data);
      setState("result");
      setQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }, [query]);

  function handleSelectExample(example: string) {
    setQuery(example);
  }

  function handleNewQuery() {
    handleSubmit();
  }

  function handleUploadComplete() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <TopNav
        onUploadClick={() => setUploadOpen(true)}
        refreshKey={refreshKey}
      />

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-36 pt-8 sm:px-6">
        {state === "idle" && (
          <EmptyState onSelectQuery={handleSelectExample} />
        )}

        {state === "loading" && (
          <div className="mx-auto w-full max-w-4xl">
            <LoadingSkeleton />
          </div>
        )}

        {state === "error" && (
          <div className="mx-auto w-full max-w-4xl space-y-4">
            {result && <QuestionCard question={result.query} />}
            <div className="rounded-lg border border-error/30 bg-error-container/20 p-6">
              <div className="flex items-center gap-2 text-on-error-container">
                <span className="material-symbols-outlined text-[18px]">
                  error
                </span>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          </div>
        )}

        {state === "result" && result && (
          <div className="mx-auto w-full max-w-4xl space-y-6">
            <QuestionCard question={result.query} />

            <AnswerCard
              answer={result.answer}
              durationMs={result.durationMs}
              sourceCount={result.sources.length}
            />

            {result.sources.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-semibold leading-6 tracking-[-0.01em] text-on-surface">
                      Sources used ({result.sources.length})
                    </h2>
                    <button
                      className="flex items-center text-outline hover:text-on-surface"
                      title="Chunks are ordered by cosine similarity to query."
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        info
                      </span>
                    </button>
                  </div>
                  <span className="font-mono text-[11px] font-medium leading-[14px] tracking-[0.02em] text-outline">
                    Embedding: gemini-embedding-001
                  </span>
                </div>

                <div className="space-y-3">
                  {result.sources.map((source, i) => (
                    <SourceCard
                      key={source.id}
                      index={i}
                      id={source.id}
                      score={source.score}
                      text={source.text}
                      metadata={source.metadata}
                      answer={result.answer}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <QueryInput
        value={query}
        onChange={setQuery}
        onSubmit={state === "result" ? handleNewQuery : handleSubmit}
        isLoading={state === "loading"}
      />

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
}
