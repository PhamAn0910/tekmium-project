"use client";

import { useState } from "react";

interface AnswerCardProps {
  answer: string;
  durationMs: number;
  sourceCount: number;
}

/**
 * Parse answer text and convert [N] citation patterns into clickable links.
 */
function renderAnswerWithCitations(text: string): React.ReactNode[] {
  // First split by **bold** markers
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  
  return boldParts.map((boldPart, i) => {
    if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
      const innerText = boldPart.slice(2, -2);
      // Process citations inside bold text just in case, though rare
      const citationParts = innerText.split(/(\[\d+\])/g);
      return (
        <strong key={i} className="font-semibold text-on-surface">
          {citationParts.map((part, j) => {
            const citationMatch = part.match(/^\[(\d+)\]$/);
            if (citationMatch) {
              const num = citationMatch[1];
              return (
                <a
                  key={`cite-${i}-${j}`}
                  href={`#source-${Number(num) - 1}`}
                  className="ml-0.5 inline-flex rounded border border-outline-variant/60 bg-surface-container px-1 py-[1px] font-mono text-[11px] font-medium leading-[14px] text-primary transition-colors hover:underline"
                >
                  [{num}]
                </a>
              );
            }
            return <span key={`text-${i}-${j}`}>{part}</span>;
          })}
        </strong>
      );
    }

    // Process citations in normal text
    const citationParts = boldPart.split(/(\[\d+\])/g);
    return (
      <span key={i}>
        {citationParts.map((part, j) => {
          const citationMatch = part.match(/^\[(\d+)\]$/);
          if (citationMatch) {
            const num = citationMatch[1];
            return (
              <a
                key={`cite-${i}-${j}`}
                href={`#source-${Number(num) - 1}`}
                className="ml-0.5 inline-flex rounded border border-outline-variant/60 bg-surface-container px-1 py-[1px] font-mono text-[11px] font-medium leading-[14px] text-primary transition-colors hover:underline"
              >
                [{num}]
              </a>
            );
          }
          return <span key={`text-${i}-${j}`}>{part}</span>;
        })}
      </span>
    );
  });
}

export function AnswerCard({ answer, durationMs, sourceCount }: AnswerCardProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(answer).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
      <div className="space-y-3 text-base leading-[26px] tracking-[-0.005em] text-on-surface">
        {answer.split("\n\n").map((paragraph, i) => (
          <p key={i}>{renderAnswerWithCitations(paragraph)}</p>
        ))}
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
