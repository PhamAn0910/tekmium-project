import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { google } from "@ai-sdk/google";
import { embed } from "ai";
import { pineconeIndex } from "../lib/pinecone";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const EMBEDDING_MODEL = "gemini-embedding-001";

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.6;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetrievedChunk {
  id: string;
  score: number;
  text: string;
  metadata: {
    row_id: number;
    chunk_index: number;
    total_chunks: number;
  };
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

/**
 * Retrieve the most relevant chunks from the vector database for a query.
 *
 * 1. Embeds the query with the same model used for indexing.
 * 2. Queries Pinecone for the nearest vectors (cosine similarity).
 * 3. Filters by minimum score and returns typed results.
 */
export async function retrieveRelevantChunks(
  query: string,
  topK = DEFAULT_TOP_K,
  minScore = DEFAULT_MIN_SCORE
): Promise<RetrievedChunk[]> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set in .env.local");
  }

  // 1. Embed the query with the same model used for indexing
  const { embedding } = await embed({
    model: google.embedding(EMBEDDING_MODEL),
    value: query,
  });

  // 2. Query Pinecone
  const response = await pineconeIndex.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });

  // 3. Filter by score and map to typed results
  const chunks: RetrievedChunk[] = (response.matches || [])
    .filter((match) => (match.score ?? 0) >= minScore)
    .map((match) => ({
      id: match.id,
      score: match.score ?? 0,
      text: (match.metadata?.text as string) || "",
      metadata: {
        row_id: match.metadata?.row_id as number,
        chunk_index: match.metadata?.chunk_index as number,
        total_chunks: match.metadata?.total_chunks as number,
      },
    }));

  return chunks;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.error("Usage: npm run retrieve -- \"<your question>\"");
    process.exit(1);
  }

  console.log(`Query: "${query}"\n`);
  console.log(`Embedding query and searching Pinecone (topK=${DEFAULT_TOP_K}, minScore=${DEFAULT_MIN_SCORE})...\n`);

  const chunks = await retrieveRelevantChunks(query);

  if (chunks.length === 0) {
    console.log("No relevant chunks found above the score threshold.");
    return;
  }

  console.log(`Found ${chunks.length} relevant chunk(s):\n`);
  console.log("=========================================");

  for (const [i, chunk] of chunks.entries()) {
    const preview = chunk.text.length > 200
      ? chunk.text.slice(0, 200) + "..."
      : chunk.text;

    console.log(`\n[${i + 1}] Score: ${chunk.score.toFixed(4)} | ID: ${chunk.id}`);
    console.log(`    Row: ${chunk.metadata.row_id}, Chunk: ${chunk.metadata.chunk_index + 1}/${chunk.metadata.total_chunks}`);
    console.log(`    Text: ${preview}`);
  }

  console.log("\n=========================================");
}

// Run CLI when executed directly
const isDirectRun = process.argv[1] &&
  (process.argv[1].endsWith("retrieve.ts") || process.argv[1].includes("retrieve"));

if (isDirectRun) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
