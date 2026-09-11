import { NextResponse } from "next/server";
import { splitText } from "@/scripts/text-splitter";
import { embedAndUpsert } from "@/lib/vector-store";

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_EXTENSIONS = [".txt", ".md"];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "A file is required. Send a 'file' field in FormData." },
        { status: 400 }
      );
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
      fileName.endsWith(ext)
    );
    if (!hasValidExtension) {
      return NextResponse.json(
        {
          error: `Invalid file type. Only ${ALLOWED_EXTENSIONS.join(", ")} files are accepted.`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large (${(file.size / 1024).toFixed(0)}KB). Maximum size is ${MAX_FILE_SIZE / 1024}KB.`,
        },
        { status: 400 }
      );
    }

    // Extract text content
    const text = await file.text();
    if (!text.trim()) {
      return NextResponse.json(
        { error: "File is empty." },
        { status: 400 }
      );
    }

    // Split into chunks
    const chunks = splitText(text);

    // Generate a stable prefix from the filename (without extension)
    const baseName = fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9]+/gi, "_")
      .slice(0, 40);
    const idPrefix = `upload_${baseName}`;

    // Embed and upsert
    const totalUpserted = await embedAndUpsert(chunks, idPrefix);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      chunksProcessed: chunks.length,
      vectorsUpserted: totalUpserted,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Failed to process upload. Check server logs." },
      { status: 500 }
    );
  }
}
