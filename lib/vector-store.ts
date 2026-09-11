import { google } from "@ai-sdk/google";
import { embedMany } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_INDEX_NAME = "tekmium-rag";
const EMBEDDING_MODEL = "gemini-embedding-001";

const EMBED_BATCH_SIZE = 50;
const UPSERT_BATCH_SIZE = 100;
const RATE_LIMIT_DELAY_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedBatchWithRetry(
  texts: string[],
  maxRetries = 5
): Promise<number[][]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { embeddings } = await embedMany({
        model: google.embedding(EMBEDDING_MODEL),
        values: texts,
        maxRetries: 0,
      });
      return embeddings;
    } catch (err: any) {
      const isRateLimit =
        err?.statusCode === 429 || err?.lastError?.statusCode === 429;
      if (isRateLimit && attempt < maxRetries - 1) {
        const backoff = Math.min(60_000, 2 ** attempt * 15_000);
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

function getPineconeIndex() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is not set.");
  }
  const pc = new Pinecone({ apiKey });
  return pc.index(PINECONE_INDEX_NAME);
}

/**
 * Embed an array of text chunks and upsert them into the Pinecone index.
 * Each chunk is assigned a stable ID based on its position and the given prefix.
 * Returns the number of vectors upserted.
 */
export async function embedAndUpsert(
  chunks: string[],
  idPrefix = "doc"
): Promise<number> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  }

  const index = getPineconeIndex();
  const totalBatches = Math.ceil(chunks.length / EMBED_BATCH_SIZE);
  let totalUpserted = 0;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * EMBED_BATCH_SIZE;
    const end = Math.min(start + EMBED_BATCH_SIZE, chunks.length);
    const batch = chunks.slice(start, end);

    const embeddings = await embedBatchWithRetry(batch);

    const pineconeRecords = batch.map((text, i) => ({
      id: `${idPrefix}_chunk_${start + i}`,
      values: embeddings[i],
      metadata: {
        text,
        chunk_index: start + i,
        total_chunks: chunks.length,
      },
    }));

    for (let i = 0; i < pineconeRecords.length; i += UPSERT_BATCH_SIZE) {
      const upsertBatch = pineconeRecords.slice(i, i + UPSERT_BATCH_SIZE);
      await index.upsert({ records: upsertBatch });
      totalUpserted += upsertBatch.length;
    }

    if (batchIdx < totalBatches - 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  return totalUpserted;
}
