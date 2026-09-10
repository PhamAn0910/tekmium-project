import { NextResponse } from "next/server";
import { generateRAGAnswer } from "@/scripts/rag-answer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "A non-empty 'question' field is required." },
        { status: 400 }
      );
    }

    const start = performance.now();
    const result = await generateRAGAnswer(question.trim());
    const durationMs = Math.round(performance.now() - start);

    return NextResponse.json({
      query: result.query,
      answer: result.answer,
      sources: result.sources,
      model: result.model,
      durationMs,
    });
  } catch (err) {
    console.error("RAG answer error:", err);
    return NextResponse.json(
      { error: "Failed to generate answer. Check server logs." },
      { status: 500 }
    );
  }
}
