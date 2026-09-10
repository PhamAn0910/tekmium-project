import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow importing from scripts/ for API routes
  serverExternalPackages: ["@pinecone-database/pinecone"],
};

export default nextConfig;
