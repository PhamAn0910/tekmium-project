import { NextResponse } from "next/server";
import { pineconeIndex } from "@/lib/pinecone";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await pineconeIndex.describeIndexStats();

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
