"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnswerCardProps {
  answer: string;
  durationMs: number;
  sourceCount: number;
}

export function AnswerCard({ answer, durationMs, sourceCount }: AnswerCardProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(answer).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Pre-process answer to convert [1] to markdown links
  const processedAnswer = answer.replace(/\[(\d+)\]/g, (match, p1) => {
    return `[${match}](#source-${Number(p1) - 1})`;
  });

  return (
    <article className="relative overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-outline-variant/50 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary-container text-surface-container-lowest">
            <span className="material-symbols-outlined text-[14px]">
              auto_awesome
            </span>
          </span>
          <span className="text-xs font-bold uppercase leading-4 tracking-wider text-on-surface">
            Answer
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 rounded border border-outline-variant/60 bg-canvas px-2 py-0.5 font-mono text-[11px] font-medium leading-[14px] text-outline">
            <span className="material-symbols-outlined text-[13px]">bolt</span>
            Synthesized in {durationMs}ms
          </span>
          <button
            onClick={handleCopy}
            className="rounded p-1 text-outline transition-colors hover:text-on-surface"
            title={copied ? "Copied!" : "Copy answer"}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? "check" : "content_copy"}
            </span>
          </button>
        </div>
      </div>

      {/* Answer body */}
      <div className="text-base leading-[26px] tracking-[-0.005em] text-on-surface">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ node, ...props }) => {
              if (props.href?.startsWith("#source-")) {
                return (
                  <a
                    {...props}
                    className="ml-0.5 inline-flex rounded border border-outline-variant/60 bg-surface-container px-1 py-[1px] font-mono text-[11px] font-medium leading-[14px] text-primary transition-colors hover:underline"
                  />
                );
              }
              return <a {...props} className="text-primary hover:underline" />;
            },
            p: ({ node, ...props }) => <p {...props} className="mb-3 last:mb-0" />,
            ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 mb-3 space-y-1 last:mb-0" />,
            ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 mb-3 space-y-1 last:mb-0" />,
            li: ({ node, ...props }) => <li {...props} className="" />,
            strong: ({ node, ...props }) => <strong {...props} className="font-semibold text-on-surface" />,
          }}
        >
          {processedAnswer}
        </Markdown>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-outline-variant/40 pt-3 text-[11px] font-medium leading-[14px] text-outline">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px] text-primary">
            verified
          </span>
          <span>
            Answer grounded in {sourceCount} retrieved source
            {sourceCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </article>
  );
}
