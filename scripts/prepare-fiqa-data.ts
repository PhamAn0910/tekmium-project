import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { splitText } from "./text-splitter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = "https://datasets-server.huggingface.co/rows";

interface HFRowsResponse {
  rows?: Array<{ row: Record<string, any> }>;
}

async function fetchHuggingFaceRows(dataset: string, config: string, split: string, limit: number) {
  let allRows: Record<string, any>[] = [];
  let offset = 0;
  
  while (offset < limit) {
    const chunk = Math.min(limit - offset, 100);
    const url = `${API_BASE}?dataset=${encodeURIComponent(dataset)}&config=${encodeURIComponent(config)}&split=${encodeURIComponent(split)}&offset=${offset}&length=${chunk}`;
    console.log(`Fetching data from: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch data: ${response.statusText} - ${errorText}`);
    }
    
    const data = (await response.json()) as HFRowsResponse;
    if (!data.rows || data.rows.length === 0) break;
    
    allRows.push(...data.rows.map((r) => r.row));
    offset += chunk;
  }
  return allRows;
}

function parseReference(refRaw: any): string {
  // HuggingFace fiqa reference is often stringified list: '["answer..."]'
  if (typeof refRaw !== "string") return String(refRaw ?? "");
  
  try {
    // Basic cleanup for python list format in string
    if (refRaw.startsWith("[") && refRaw.endsWith("]")) {
      const parsed = JSON.parse(refRaw.replace(/'/g, '"'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
    }
  } catch {
    // If JSON parse fails, try basic string stripping
    if (refRaw.startsWith("['") && refRaw.endsWith("']")) {
      return refRaw.slice(2, -2);
    } else if (refRaw.startsWith('["') && refRaw.endsWith('"]')) {
      return refRaw.slice(2, -2);
    }
  }
  return refRaw;
}

function parseContexts(ctxRaw: any): string[] {
  if (Array.isArray(ctxRaw)) return ctxRaw;
  if (typeof ctxRaw === "string") {
    try {
      const parsed = JSON.parse(ctxRaw.replace(/'/g, '"'));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [ctxRaw];
    }
  }
  return [];
}

async function main() {
  const kbPath = path.join(__dirname, "..", "dataset", "knowledge_base.jsonl");
  const tcPath = path.join(__dirname, "..", "dataset", "test_cases.json");

  console.log("Downloading dataset subsets via HuggingFace API...");

  // 1. Fetch exactly 20 test cases
  const evalRows = await fetchHuggingFaceRows("vibrantlabsai/fiqa", "ragas_eval_v3", "baseline", 20);
  
  const testCases = [];
  const goldContexts: string[] = [];

  for (const row of evalRows) {
    const userInput = row.user_input || "";
    const refClean = parseReference(row.reference);
    
    testCases.push({
      user_input: userInput,
      reference: refClean
    });

    // Extract gold contexts that actually contain the answers to these questions
    const contexts = parseContexts(row.retrieved_contexts);
    goldContexts.push(...contexts);
  }

  // 2. Fetch 180 random items from the corpus to act as distractors
  // (Total KB size = 20 gold contexts + 180 distractors = ~200 items)
  const corpusRows = await fetchHuggingFaceRows("vibrantlabsai/fiqa", "corpus", "corpus", 180);
  
  const distractors = corpusRows.map(row => row.doc || "");

  // Combine gold contexts and distractors
  // We use a Set to avoid any duplicates
  const finalCorpusSet = new Set([...goldContexts, ...distractors]);
  
  // 3. Chunk and write Knowledge Base (JSONL)
  const corpus = [...finalCorpusSet].filter(t => t.trim());
  const kbLines: string[] = [];

  for (let rowId = 0; rowId < corpus.length; rowId++) {
    const chunks = splitText(corpus[rowId]);
    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      kbLines.push(JSON.stringify({
        text: chunks[chunkIdx],
        metadata: {
          row_id: rowId,
          chunk_index: chunkIdx,
          total_chunks: chunks.length,
        },
      }));
    }
  }

  fs.writeFileSync(kbPath, kbLines.join("\n") + "\n", { encoding: "utf-8" });

  // 4. Write Test Cases (JSON)
  fs.writeFileSync(tcPath, JSON.stringify(testCases, null, 2), { encoding: "utf-8" });

  console.log("=========================================");
  console.log(`✅ Data preparation complete!`);
  console.log(`- Knowledge Base: ${corpus.length} rows → ${kbLines.length} chunks saved to knowledge_base.jsonl`);
  console.log(`- Test Cases: ${testCases.length} records saved to test_cases.json`);
  console.log("=========================================");
}

main().catch(console.error);
