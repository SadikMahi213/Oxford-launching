import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The repo lives inside a git root that contains unrelated projects with
  // their own lockfiles. Pin the tracing root to this app to avoid Next.js
  // picking up a stray G:\package-lock.json.
  outputFileTracingRoot: __dirname,
  env: {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1",
  },
};

export default nextConfig;

