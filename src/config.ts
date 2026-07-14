import "dotenv/config";

export interface AppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
  groqApiKey: string;
  model: string;
  port: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function normalizePrivateKey(value: string): string {
  if (value.includes("BEGIN")) return value;
  try {
    const decoded = Buffer.from(value, "base64").toString("utf-8");
    if (decoded.includes("BEGIN")) return decoded;
  } catch {
    // not base64 — return as-is
  }
  return value;
}

function load(): AppConfig {
  return {
    appId: requireEnv("GITHUB_APP_ID"),
    privateKey: normalizePrivateKey(requireEnv("GITHUB_PRIVATE_KEY")),
    webhookSecret: requireEnv("GITHUB_WEBHOOK_SECRET"),
    groqApiKey: requireEnv("GROQ_API_KEY"),
    model: process.env.MODEL ?? "llama-3.3-70b-versatile",
    port: parseInt(process.env.PORT ?? "3000", 10),
  };
}

export const config: AppConfig = load();