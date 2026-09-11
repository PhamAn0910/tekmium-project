import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_INDEX_NAME = "tekmium-rag";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "PINECONE_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const pc = new Pinecone({ apiKey });
    const index = pc.index(PINECONE_INDEX_NAME);
    const stats = await index.describeIndexStats();

    return NextResponse.json({
      totalVectors: stats.totalRecordCount ?? 0,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch index stats." },
      { status: 500 }
    );
  }
}
