import dns from "node:dns";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

dns.setDefaultResultOrder("ipv4first");

function applyLocalEnv() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      const current = process.env[key];
      if (!current || current.includes("placeholder")) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional until the project is configured.
  }
}

applyLocalEnv();

const nextConfig: NextConfig = {
  serverExternalPackages: ["undici", "@aws-sdk/client-s3"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
