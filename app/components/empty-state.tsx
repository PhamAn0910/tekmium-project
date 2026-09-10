"use client";

const EXAMPLE_QUERIES = [
  {
    question:
      "How to deposit a cheque issued to an associate in my business into my business account?",
    topic: "Banking",
  },
  {
    question:
      "What are the main risks of investing in a single stock versus a diversified portfolio?",
    topic: "Investing",
  },
  {
    question:
      "Is it better to pay off student loans early or invest the extra money?",
    topic: "Personal Finance",
  },
];

interface EmptyStateProps {
  onSelectQuery: (query: string) => void;
}

export function EmptyState({ onSelectQuery }: EmptyStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
      {/* Hero */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest">
          <span className="material-symbols-outlined text-primary text-[24px]">
            search
          </span>
        </div>
        <h1 className="mb-1 text-2xl font-semibold leading-8 tracking-[-0.02em] text-on-surface">
          Explore your indexed documentation
        </h1>
        <p className="max-w-lg text-sm leading-[22px] text-on-surface-variant">
          Tekmium RAG retrieves relevant chunks from your knowledge base and
          generates grounded answers with source citations.
        </p>
      </div>

      {/* Example Queries */}
      <div className="flex w-full flex-col space-y-2">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-medium leading-4 tracking-[0.01em] text-on-surface-variant">
            Or start with an example query:
          </span>
          <span className="font-mono text-[11px] font-medium leading-[14px] tracking-[0.02em] text-on-surface-variant">
            FiQA dataset
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example.question}
              onClick={() => onSelectQuery(example.question)}
              className="group flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest p-3.5 text-left transition-colors duration-150 ease-linear hover:border-outline hover:bg-surface-bright"
            >
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium leading-[22px] text-on-surface transition-colors duration-150 group-hover:text-primary">
                  {example.question}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-sm border border-outline-variant bg-surface-container-high px-1.5 py-0.5 font-mono text-[11px] font-medium leading-[14px] text-on-surface-variant">
                    {example.topic}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined ml-3 text-outline transition-all duration-150 ease-linear group-hover:translate-x-0.5 group-hover:text-primary">
                arrow_forward
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
