import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import type { DatabaseSchema } from "./dataBins";

export const DB_VERSION = 1;
export const REDIS_DB_KEY = "overdrive:internal-db";

const DB_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "internal-db.json");

export function emptyDatabase(): DatabaseSchema {
  return {
    version: DB_VERSION,
    records: [],
    lastSyncedAt: null,
  };
}

function normalizeDatabase(parsed: DatabaseSchema): DatabaseSchema {
  return {
    version: parsed.version ?? DB_VERSION,
    records: Array.isArray(parsed.records) ? parsed.records : [],
    lastSyncedAt: parsed.lastSyncedAt ?? null,
  };
}

function useRedisStorage(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

async function ensureLocalDatabaseFile(): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(
      DB_FILE,
      JSON.stringify(emptyDatabase(), null, 2),
      "utf-8"
    );
  }
}

async function loadFromFile(): Promise<DatabaseSchema> {
  await ensureLocalDatabaseFile();
  const raw = await fs.readFile(DB_FILE, "utf-8");
  try {
    return normalizeDatabase(JSON.parse(raw) as DatabaseSchema);
  } catch {
    return emptyDatabase();
  }
}

async function saveToFile(db: DatabaseSchema): Promise<void> {
  await ensureLocalDatabaseFile();
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

async function loadFromRedis(): Promise<DatabaseSchema> {
  try {
    const data = await getRedisClient().get<DatabaseSchema>(REDIS_DB_KEY);
    if (!data) return emptyDatabase();
    return normalizeDatabase(data);
  } catch {
    return emptyDatabase();
  }
}

async function saveToRedis(db: DatabaseSchema): Promise<void> {
  await getRedisClient().set(REDIS_DB_KEY, db);
}

export async function loadDatabase(): Promise<DatabaseSchema> {
  if (useRedisStorage()) {
    return loadFromRedis();
  }
  return loadFromFile();
}

export async function saveDatabase(db: DatabaseSchema): Promise<void> {
  if (useRedisStorage()) {
    await saveToRedis(db);
    return;
  }
  await saveToFile(db);
}

export function getStorageBackend(): "redis" | "local" {
  return useRedisStorage() ? "redis" : "local";
}
