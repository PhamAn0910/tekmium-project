import { Pinecone } from "@pinecone-database/pinecone";

const globalForPinecone = globalThis as unknown as { pinecone?: Pinecone };

export function getPineconeClient() {
  if (!globalForPinecone.pinecone) {
    globalForPinecone.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || "",
    });
  }
  return globalForPinecone.pinecone;
}

export const PINECONE_INDEX_NAME = "tekmium-rag";

export const pineconeIndex = new Proxy({} as ReturnType<Pinecone["index"]>, {
  get: (target, prop) => {
    const client = getPineconeClient();
    const index = client.index(PINECONE_INDEX_NAME);
    const value = (index as any)[prop];
    if (typeof value === "function") {
      return value.bind(index);
    }
    return value;
  }
});
