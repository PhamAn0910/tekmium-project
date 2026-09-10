import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { google } from "@ai-sdk/google";
import { embedMany } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const PINECONE_INDEX_NAME = "tekmium-rag";
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSION = 3072;

// Free tier: 100 embed requests/min. Each batchEmbedContents counts as 1 request,
// but embedMany splits into sub-batches of maxEmbeddingsPerCall (100) and fires
// them in parallel. To stay under 100 RPM, we send small serial batches with delays.
const EMBED_BATCH_SIZE = 50; // texts per embedMany call (single API request)
const UPSERT_BATCH_SIZE = 100; // Pinecone recommended max per upsert
const RATE_LIMIT_DELAY_MS = 2_000; // delay between embed batches

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KBRecord {
  text: string;
  metadata: {
    row_id: number;
    chunk_index: number;
    total_chunks: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadKnowledgeBase(filePath: string): KBRecord[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());
  return lines.map((line) => JSON.parse(line) as KBRecord);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Embed a batch of texts using the Vercel AI SDK.
 * Keeps batch size ≤ maxEmbeddingsPerCall (100) so it stays as a single
 * batchEmbedContents API request. Retries on 429 with exponential backoff.
 */
async function embedBatchWithRetry(
  texts: string[],
  maxRetries = 5
): Promise<number[][]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { embeddings } = await embedMany({
        model: google.embedding(EMBEDDING_MODEL),
        values: texts,
        maxRetries: 0, // we handle retries ourselves
      });
      return embeddings;
    } catch (err: any) {
      const isRateLimit = err?.statusCode === 429 || err?.lastError?.statusCode === 429;
      if (isRateLimit && attempt < maxRetries - 1) {
        // Parse retry delay from error or use exponential backoff
        const backoff = Math.min(60_000, (2 ** attempt) * 15_000);
        console.log(
          `  ⏳ Rate limited. Waiting ${(backoff / 1000).toFixed(0)}s before retry (attempt ${attempt + 1}/${maxRetries})...`
        );
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Validate env
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set in .env.local");
  }
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is not set in .env.local");
  }

  // 1. Load knowledge base
  const kbPath = path.join(__dirname, "..", "dataset", "knowledge_base.jsonl");
  const records = loadKnowledgeBase(kbPath);
  console.log(`Loaded ${records.length} chunks from knowledge_base.jsonl`);

  // 2. Initialize Pinecone and ensure index exists
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

  const existingIndexes = await pc.listIndexes();
  const indexExists = existingIndexes.indexes?.some(
    (idx) => idx.name === PINECONE_INDEX_NAME
  );

  if (!indexExists) {
    console.log(
      `Creating Pinecone index "${PINECONE_INDEX_NAME}" (dim=${EMBEDDING_DIMENSION}, cosine)...`
    );
    await pc.createIndex({
      name: PINECONE_INDEX_NAME,
      dimension: EMBEDDING_DIMENSION,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });

    // Wait for the index to be ready
    console.log("Waiting for index to initialize...");
    let ready = false;
    while (!ready) {
      const desc = await pc.describeIndex(PINECONE_INDEX_NAME);
      if (desc.status?.ready) {
        ready = true;
      } else {
        await sleep(3000);
      }
    }
    console.log("Index is ready.");
  } else {
    console.log(`Pinecone index "${PINECONE_INDEX_NAME}" already exists.`);
  }

  const index = pc.index(PINECONE_INDEX_NAME);

  // 3. Embed and upsert in batches
  const totalBatches = Math.ceil(records.length / EMBED_BATCH_SIZE);
  let totalEmbedded = 0;
  let totalUpserted = 0;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * EMBED_BATCH_SIZE;
    const end = Math.min(start + EMBED_BATCH_SIZE, records.length);
    const batch = records.slice(start, end);

    console.log(
      `\nBatch ${batchIdx + 1}/${totalBatches}: embedding chunks ${start}–${end - 1}...`
    );

    // Generate embeddings with rate-limit handling
    const texts = batch.map((r) => r.text);
    const embeddings = await embedBatchWithRetry(texts);
    totalEmbedded += embeddings.length;
    console.log(`  ✓ Embedded ${totalEmbedded}/${records.length} chunks`);

    // Prepare Pinecone records
    const pineconeRecords = batch.map((record, i) => ({
      id: `row_${record.metadata.row_id}_chunk_${record.metadata.chunk_index}`,
      values: embeddings[i],
      metadata: {
        text: record.text,
        row_id: record.metadata.row_id,
        chunk_index: record.metadata.chunk_index,
        total_chunks: record.metadata.total_chunks,
      },
    }));

    // Upsert to Pinecone (sub-batch if needed)
    for (let i = 0; i < pineconeRecords.length; i += UPSERT_BATCH_SIZE) {
      const upsertBatch = pineconeRecords.slice(i, i + UPSERT_BATCH_SIZE);
      await index.upsert({ records: upsertBatch });
      totalUpserted += upsertBatch.length;
      console.log(`  ✓ Upserted ${totalUpserted}/${records.length} vectors`);
    }

    // Rate-limit delay between batches (skip after last batch)
    if (batchIdx < totalBatches - 1) {
      console.log(
        `  Waiting ${(RATE_LIMIT_DELAY_MS / 1000).toFixed(0)}s for rate limit...`
      );
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  // 4. Verify by checking index stats
  console.log("\nVerifying index stats...");
  // Small delay for Pinecone to reflect upserts
  await sleep(5000);
  const stats = await index.describeIndexStats();
  console.log(`\n=========================================`);
  console.log(`✅ Embedding + indexing complete!`);
  console.log(`- Model: ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSION} dims)`);
  console.log(`- Index: ${PINECONE_INDEX_NAME}`);
  console.log(`- Vectors in index: ${stats.totalRecordCount}`);
  console.log(`=========================================`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
