interface QuestionCardProps {
  question: string;
}

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-on-surface text-surface-container-lowest">
        <span className="material-symbols-outlined text-[14px]">person</span>
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-semibold leading-6 tracking-[-0.01em] text-on-surface">
          {question}
        </h1>
      </div>
    </div>
  );
}
