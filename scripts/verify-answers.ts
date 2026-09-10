import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { generateRAGAnswer, type RAGResult } from "./rag-answer.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

// Delay between queries to respect API rate limits (embedding + generation)
const RATE_LIMIT_DELAY_MS = 3_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestCase {
  user_input: string;
  reference: string;
}

interface TestResult {
  index: number;
  query: string;
  hasOverlap: boolean;
  chunksUsed: number;
  elapsedMs: number;
  answer: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if the generated answer contains meaningful phrases from the
 * reference answer. Uses a sliding window of words to find overlapping
 * phrases — same approach as verify-retrieval.ts.
 */
function checkOverlap(
  answer: string,
  reference: string,
  minPhraseWords = 4
): boolean {
  const answerLower = answer.toLowerCase();
  const refWords = reference.toLowerCase().split(/\s+/);

  // Build phrases of minPhraseWords consecutive words from the reference
  const phrases: string[] = [];
  for (let i = 0; i <= refWords.length - minPhraseWords; i++) {
    phrases.push(refWords.slice(i, i + minPhraseWords).join(" "));
  }

  // Check if the answer contains any of the reference phrases
  for (const phrase of phrases) {
    if (answerLower.includes(phrase)) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const testCasesPath = path.join(
    __dirname,
    "..",
    "dataset",
    "test_cases.json"
  );
  const testCases: TestCase[] = JSON.parse(
    fs.readFileSync(testCasesPath, "utf-8")
  );

  console.log(
    `Verifying RAG answers against ${testCases.length} test cases...`
  );
  console.log(`Rate limit delay: ${RATE_LIMIT_DELAY_MS}ms between queries\n`);

  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const queryPreview =
      tc.user_input.length > 70
        ? tc.user_input.slice(0, 70) + "..."
        : tc.user_input;

    process.stdout.write(
      `[${i + 1}/${testCases.length}] "${queryPreview}" `
    );

    const start = Date.now();
    let ragResult: RAGResult;

    try {
      ragResult = await generateRAGAnswer(tc.user_input);
    } catch (err: any) {
      console.log(`→ ❌ ERROR: ${err.message}`);
      results.push({
        index: i + 1,
        query: tc.user_input,
        hasOverlap: false,
        chunksUsed: 0,
        elapsedMs: Date.now() - start,
        answer: `ERROR: ${err.message}`,
      });

      if (i < testCases.length - 1) {
        await sleep(RATE_LIMIT_DELAY_MS);
      }
      continue;
    }

    const elapsedMs = Date.now() - start;
    const hasOverlap = checkOverlap(ragResult.answer, tc.reference);

    results.push({
      index: i + 1,
      query: tc.user_input,
      hasOverlap,
      chunksUsed: ragResult.sources.length,
      elapsedMs,
      answer: ragResult.answer,
    });

    const status = hasOverlap ? "✅ HIT" : "❌ MISS";
    console.log(
      `→ ${ragResult.sources.length} chunks, ${(elapsedMs / 1000).toFixed(1)}s ${status}`
    );

    // Rate-limit delay between queries (skip after last)
    if (i < testCases.length - 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  // Summary
  const hits = results.filter((r) => r.hasOverlap).length;
  const misses = results.filter((r) => !r.hasOverlap).length;
  const avgElapsed =
    results.reduce((sum, r) => sum + r.elapsedMs, 0) / results.length;

  console.log(`\n=========================================`);
  console.log(`RAG Answer Verification Summary`);
  console.log(`=========================================`);
  console.log(`Total test cases: ${testCases.length}`);
  console.log(`Hits (overlap found): ${hits}`);
  console.log(`Misses: ${misses}`);
  console.log(`Hit rate: ${((hits / testCases.length) * 100).toFixed(1)}%`);
  console.log(`Average latency: ${(avgElapsed / 1000).toFixed(1)}s`);
  console.log(`=========================================`);

  if (misses > 0) {
    console.log(`\nMissed test cases:`);
    for (const r of results.filter((r) => !r.hasOverlap)) {
      const answerPreview =
        r.answer.length > 120 ? r.answer.slice(0, 120) + "..." : r.answer;
      console.log(
        `  [${r.index}] "${r.query}" (chunks=${r.chunksUsed})`
      );
      console.log(`       Answer: ${answerPreview}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
