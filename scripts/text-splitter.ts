/**
 * Recursive character text splitter.
 *
 * Splits text along a hierarchy of separators ("\n\n", "\n", " ", ""),
 * producing chunks that stay within the configured size limit with
 * configurable overlap between consecutive chunks.
 */

export interface SplitOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

const DEFAULTS: Required<SplitOptions> = {
  chunkSize: 700,
  chunkOverlap: 50,
  separators: ["\n\n", "\n", " ", ""],
};

/**
 * Split `text` into chunks of at most `chunkSize` characters, using the
 * highest-priority separator that produces pieces within the limit.
 * Consecutive chunks share `chunkOverlap` characters of trailing context.
 */
export function splitText(text: string, options?: SplitOptions): string[] {
  const { chunkSize, chunkOverlap, separators } = { ...DEFAULTS, ...options };

  if (text.length <= chunkSize) return [text];

  return recursiveSplit(text, separators, chunkSize, chunkOverlap);
}

function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  if (text.length <= chunkSize) return [text];
  if (separators.length === 0) {
    // Character-level fallback: hard-cut at chunkSize
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      chunks.push(text.slice(start, start + chunkSize));
      start += chunkSize - chunkOverlap;
    }
    return chunks;
  }

  const sep = separators[0];
  const remaining = separators.slice(1);

  const pieces = sep === "" ? [...text] : text.split(sep);
  const merged: string[] = [];
  let current = "";

  for (const piece of pieces) {
    const candidate = current ? current + sep + piece : piece;

    if (candidate.length <= chunkSize) {
      current = candidate;
    } else {
      // Flush current buffer as a chunk (may need recursive sub-splitting)
      if (current) {
        merged.push(...recursiveSplit(current, remaining, chunkSize, chunkOverlap));
      }
      current = piece;
    }
  }

  if (current) {
    merged.push(...recursiveSplit(current, remaining, chunkSize, chunkOverlap));
  }

  // Apply overlap between consecutive chunks
  if (chunkOverlap > 0 && merged.length > 1) {
    return applyOverlap(merged, chunkOverlap, chunkSize);
  }

  return merged;
}

function applyOverlap(chunks: string[], overlap: number, chunkSize: number): string[] {
  const result: string[] = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = result[result.length - 1];
    const overlapText = prevChunk.slice(-overlap);
    const merged = overlapText + chunks[i];

    // Only add overlap if it doesn't push past the size limit
    if (merged.length <= chunkSize) {
      result.push(merged);
    } else {
      result.push(chunks[i]);
    }
  }

  return result;
}
