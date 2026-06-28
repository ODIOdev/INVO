import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import type { DraftState } from "@/lib/drafts";

const REDIS_PREFIX = "overdrive:pdf-download:";
const TTL_SECONDS = 60 * 60 * 24 * 30;
const TOKENS_DIR = path.join(process.cwd(), ".data", "pdf-downloads");

type StoredPdfDownload = {
  state: DraftState;
  expiresAt: number;
};

function getPublicAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "http://localhost:3000";
}

function getRedisEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.KV_REST_API_TOKEN ??
    "";
  if (!url || !token) return null;
  return { url, token };
}

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const env = getRedisEnv();
    if (env) {
      redisClient = new Redis({ url: env.url, token: env.token });
    } else {
      redisClient = Redis.fromEnv();
    }
  }
  return redisClient;
}

async function ensureTokensDir(): Promise<void> {
  await fs.mkdir(TOKENS_DIR, { recursive: true });
}

async function storePdfDownloadToken(
  token: string,
  state: DraftState
): Promise<void> {
  const payload: StoredPdfDownload = {
    state,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  };

  if (getRedisEnv()) {
    await getRedisClient().set(`${REDIS_PREFIX}${token}`, payload, {
      ex: TTL_SECONDS,
    });
    return;
  }

  await ensureTokensDir();
  await fs.writeFile(
    path.join(TOKENS_DIR, `${token}.json`),
    JSON.stringify(payload),
    "utf-8"
  );
}

export async function getPdfDownloadState(
  token: string
): Promise<DraftState | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  if (getRedisEnv()) {
    const payload = await getRedisClient().get<StoredPdfDownload>(
      `${REDIS_PREFIX}${trimmed}`
    );
    if (!payload?.state) return null;
    if (payload.expiresAt && payload.expiresAt < Date.now()) return null;
    return payload.state;
  }

  try {
    const raw = await fs.readFile(
      path.join(TOKENS_DIR, `${trimmed}.json`),
      "utf-8"
    );
    const payload = JSON.parse(raw) as StoredPdfDownload;
    if (!payload.state || payload.expiresAt < Date.now()) return null;
    return payload.state;
  } catch {
    return null;
  }
}

export async function createInvoicePdfDownloadUrl(
  state: DraftState
): Promise<string> {
  const token = randomUUID();
  await storePdfDownloadToken(token, state);
  return `${getPublicAppUrl()}/api/invoice/pdf?token=${encodeURIComponent(token)}&dl=1`;
}
