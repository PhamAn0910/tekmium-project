interface SourceCardProps {
  index: number;
  id: string;
  score: number;
  text: string;
  metadata: {
    row_id: number;
    chunk_index: number;
    total_chunks: number;
  };
  answer?: string;
}

function getHighlightIntervals(sourceText: string, answer: string, minPhraseWords = 4): [number, number][] {
  if (!answer) return [];
  const answerWords = answer.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
  const intervals: [number, number][] = [];
  
  for (let i = 0; i <= answerWords.length - minPhraseWords; i++) {
    const phraseWords = answerWords.slice(i, i + minPhraseWords);
    // Escape regex characters in words
    const safeWords = phraseWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = safeWords.join('[^a-zA-Z0-9]+');
    const regex = new RegExp(pattern, 'gi');
    
    let match;
    while ((match = regex.exec(sourceText)) !== null) {
      intervals.push([match.index, match.index + match[0].length]);
      // Avoid infinite loop if regex matches zero-length
      if (match[0].length === 0) regex.lastIndex++;
    }
  }
  
  if (intervals.length === 0) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  
  const merged: [number, number][] = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const last = merged[merged.length - 1];
    
    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

function renderHighlightedText(text: string, intervals: [number, number][]) {
  if (intervals.length === 0) return text;
  
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  
  intervals.forEach(([start, end], i) => {
    if (start > lastIndex) {
      result.push(<span key={`text-${i}`}>{text.substring(lastIndex, start)}</span>);
    }
    result.push(
      <mark key={`mark-${i}`} className="bg-primary/20 text-on-surface rounded-sm">
        {text.substring(start, end)}
      </mark>
    );
    lastIndex = end;
  });
  
  if (lastIndex < text.length) {
    result.push(<span key={`text-end`}>{text.substring(lastIndex)}</span>);
  }
  
  return result;
}

export function SourceCard({
  index,
  id,
  score,
  text,
  metadata,
  answer,
}: SourceCardProps) {
  const matchPercent = Math.round(score * 100);
  const intervals = getHighlightIntervals(text, answer || "");

  return (
    <div
      id={`source-${index}`}
      className="scroll-mt-20 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 transition-colors duration-150 ease-linear hover:border-outline"
    >
      {/* Header row */}
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="material-symbols-outlined shrink-0 text-[18px] text-outline">
            description
          </span>
          <span className="truncate font-mono text-xs leading-4 font-medium text-on-surface">
            {id}
          </span>
          <span className="shrink-0 text-[11px] font-medium leading-[14px] tracking-[0.02em] text-outline">
            row {metadata.row_id}, chunk {metadata.chunk_index + 1}/
            {metadata.total_chunks}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded border border-match-border bg-match-bg px-2 py-0.5 font-mono text-[11px] font-semibold leading-[14px] text-primary-container">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />
          {matchPercent}% match
        </div>
      </div>

      {/* Chunk text */}
      <div className="rounded-r-lg border-y border-r border-l-2 border-outline-variant/60 border-l-primary-container bg-canvas p-3">
        <p className="text-[13px] leading-[18px] text-on-surface-variant">
          {renderHighlightedText(text, intervals)}
        </p>
      </div>
    </div>
  );
}
