import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Pinecone } from "@pinecone-database/pinecone";
import { embedAndUpsert } from "@/lib/vector-store";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const PINECONE_INDEX_NAME = "tekmium-rag";
const EMBEDDING_DIMENSION = 3072;

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
  const defaultKbPath = path.join(__dirname, "..", "dataset", "knowledge_base.jsonl");
  const kbPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultKbPath;
  const records = loadKnowledgeBase(kbPath);
  console.log(`Loaded ${records.length} chunks from ${path.basename(kbPath)}`);

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

  // 3. Embed and upsert using shared library
  const texts = records.map((r) => r.text);
  console.log(`\nEmbedding and upserting ${texts.length} chunks...`);
  const totalUpserted = await embedAndUpsert(texts, "fiqa");

  // 4. Verify by checking index stats
  console.log("\nVerifying index stats...");
  await sleep(5000);
  const index = pc.index(PINECONE_INDEX_NAME);
  const stats = await index.describeIndexStats();
  console.log(`\n=========================================`);
  console.log(`✅ Embedding + indexing complete!`);
  console.log(`- Vectors upserted this run: ${totalUpserted}`);
  console.log(`- Index: ${PINECONE_INDEX_NAME}`);
  console.log(`- Vectors in index: ${stats.totalRecordCount}`);
  console.log(`=========================================`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
