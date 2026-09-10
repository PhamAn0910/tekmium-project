import * as path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { retrieveRelevantChunks, type RetrievedChunk } from "./retrieve";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const GENERATION_MODEL = "gemini-3.6-flash";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RAGResult {
  query: string;
  answer: string;
  sources: RetrievedChunk[];
  model: string;
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTIONS = `You are a helpful financial Q&A assistant. Answer the user's question using ONLY the provided context chunks below.

Rules:
- Base your answer strictly on the information in the context chunks.
- Reference your sources using the numbered tags like [1], [2], etc.
- If the context does not contain enough information to answer the question, say "I don't have enough information in the provided sources to answer this question."
- Keep your answer concise and factual.
- Do not make up information that is not in the context.`;

/**
 * Build the user message with numbered context chunks and the question.
 */
function buildUserPrompt(question: string, chunks: RetrievedChunk[]): string {
  const contextBlock = chunks
    .map((chunk, i) => {
      return `[${i + 1}] (score: ${chunk.score.toFixed(4)}, id: ${chunk.id})\n${chunk.text}`;
    })
    .join("\n\n");

  return `Context:\n${contextBlock}\n\nQuestion: ${question}`;
}

// ---------------------------------------------------------------------------
// Core RAG function
// ---------------------------------------------------------------------------

/**
 * Complete RAG pipeline: question → retrieve → LLM → answer with sources.
 *
 * 1. Retrieves the most relevant chunks from the vector database.
 * 2. Builds a prompt with numbered context chunks.
 * 3. Calls the LLM to generate a grounded answer.
 * 4. Returns the answer and the source chunks used as context.
 */
export async function generateRAGAnswer(question: string): Promise<RAGResult> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set in .env.local");
  }

  // 1. Retrieve relevant chunks
  const chunks = await retrieveRelevantChunks(question);

  if (chunks.length === 0) {
    return {
      query: question,
      answer:
        "I don't have enough information in the provided sources to answer this question. No relevant chunks were found in the knowledge base.",
      sources: [],
      model: GENERATION_MODEL,
    };
  }

  // 2. Build prompt with context
  const userPrompt = buildUserPrompt(question, chunks);

  // 3. Generate answer via LLM
  const { text } = await generateText({
    model: google(GENERATION_MODEL),
    instructions: SYSTEM_INSTRUCTIONS,
    prompt: userPrompt,
  });

  return {
    query: question,
    answer: text,
    sources: chunks,
    model: GENERATION_MODEL,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const question = process.argv.slice(2).join(" ");
  if (!question) {
    console.error('Usage: npm run ask -- "your question"');
    process.exit(1);
  }

  console.log(`Question: "${question}"\n`);
  console.log("Retrieving context and generating answer...\n");

  const result = await generateRAGAnswer(question);

  // Print answer
  console.log("=========================================");
  console.log("Answer:");
  console.log("=========================================");
  console.log(result.answer);

  // Print sources
  console.log("\n=========================================");
  console.log(`Sources (${result.sources.length} chunk(s), model: ${result.model}):`);
  console.log("=========================================");

  if (result.sources.length === 0) {
    console.log("No sources — no relevant chunks were retrieved.");
  } else {
    for (const [i, chunk] of result.sources.entries()) {
      const preview =
        chunk.text.length > 200
          ? chunk.text.slice(0, 200) + "..."
          : chunk.text;

      console.log(
        `\n[${i + 1}] Score: ${chunk.score.toFixed(4)} | ID: ${chunk.id}`
      );
      console.log(
        `    Row: ${chunk.metadata.row_id}, Chunk: ${chunk.metadata.chunk_index + 1}/${chunk.metadata.total_chunks}`
      );
      console.log(`    Text: ${preview}`);
    }
  }

  console.log("\n=========================================");
}

// Run CLI when executed directly
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("rag-answer.ts") ||
    process.argv[1].includes("rag-answer"));

if (isDirectRun) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
