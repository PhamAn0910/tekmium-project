import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { retrieveRelevantChunks, type RetrievedChunk } from "./retrieve";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const TOP_K = 5;
const MIN_SCORE = 0.6;

// Delay between queries to respect embedding API rate limits
const RATE_LIMIT_DELAY_MS = 1_500;

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
  chunksRetrieved: number;
  topScore: number;
  hasOverlap: boolean;
  chunks: RetrievedChunk[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if any retrieved chunk contains a meaningful substring of the
 * reference answer. Uses sliding window of words to find overlapping phrases.
 */
function checkOverlap(
  chunks: RetrievedChunk[],
  reference: string,
  minPhraseWords = 6
): boolean {
  const refLower = reference.toLowerCase();
  const refWords = refLower.split(/\s+/);

  // Build phrases of minPhraseWords consecutive words from the reference
  const phrases: string[] = [];
  for (let i = 0; i <= refWords.length - minPhraseWords; i++) {
    phrases.push(refWords.slice(i, i + minPhraseWords).join(" "));
  }

  // Check if any chunk text contains any of the reference phrases
  for (const chunk of chunks) {
    const chunkLower = chunk.text.toLowerCase();
    for (const phrase of phrases) {
      if (chunkLower.includes(phrase)) {
        return true;
      }
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const testCasesPath = path.join(__dirname, "..", "dataset", "test_cases.json");
  const testCases: TestCase[] = JSON.parse(
    fs.readFileSync(testCasesPath, "utf-8")
  );

  console.log(`Verifying retrieval against ${testCases.length} test cases...`);
  console.log(`Config: topK=${TOP_K}, minScore=${MIN_SCORE}\n`);

  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const queryPreview = tc.user_input.length > 80
      ? tc.user_input.slice(0, 80) + "..."
      : tc.user_input;

    process.stdout.write(`[${i + 1}/${testCases.length}] "${queryPreview}" `);

    const chunks = await retrieveRelevantChunks(tc.user_input, TOP_K, MIN_SCORE);
    const topScore = chunks.length > 0 ? chunks[0].score : 0;
    const hasOverlap = checkOverlap(chunks, tc.reference);

    results.push({
      index: i + 1,
      query: tc.user_input,
      chunksRetrieved: chunks.length,
      topScore,
      hasOverlap,
      chunks,
    });

    const status = hasOverlap ? "✅ HIT" : "❌ MISS";
    console.log(
      `→ ${chunks.length} chunks, top=${topScore.toFixed(4)} ${status}`
    );

    // Rate-limit delay between queries (skip after last)
    if (i < testCases.length - 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  // Summary
  const hits = results.filter((r) => r.hasOverlap).length;
  const misses = results.filter((r) => !r.hasOverlap).length;
  const avgTopScore = results.reduce((sum, r) => sum + r.topScore, 0) / results.length;

  console.log(`\n=========================================`);
  console.log(`Retrieval Verification Summary`);
  console.log(`=========================================`);
  console.log(`Total test cases: ${testCases.length}`);
  console.log(`Hits (overlap found): ${hits}`);
  console.log(`Misses: ${misses}`);
  console.log(`Hit rate: ${((hits / testCases.length) * 100).toFixed(1)}%`);
  console.log(`Average top score: ${avgTopScore.toFixed(4)}`);
  console.log(`=========================================`);

  if (misses > 0) {
    console.log(`\nMissed test cases:`);
    for (const r of results.filter((r) => !r.hasOverlap)) {
      console.log(`  [${r.index}] "${r.query}" (top=${r.topScore.toFixed(4)}, chunks=${r.chunksRetrieved})`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
