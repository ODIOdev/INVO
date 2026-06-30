import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import type { DatabaseSchema, StoredRecord } from "./dataBins";
import { MASTER_PROFILE_ID } from "@/lib/admin-auth-constants";

export const DB_VERSION = 1;
export const REDIS_DB_KEY = "overdrive:internal-db";

const DB_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "internal-db.json");

export function emptyDatabase(): DatabaseSchema {
  return {
    version: DB_VERSION,
    records: [],
    deletedRecords: [],
    adminProfiles: [],
    lastSyncedAt: null,
  };
}

function migrateRecordProfileIds(records: StoredRecord[]): StoredRecord[] {
  return records.map((record) =>
    record.profileId
      ? record
      : { ...record, profileId: MASTER_PROFILE_ID }
  );
}

function normalizeDatabase(parsed: DatabaseSchema): DatabaseSchema {
  const records = migrateRecordProfileIds(
    Array.isArray(parsed.records) ? parsed.records : []
  );
  const deletedRecords = (
    Array.isArray(parsed.deletedRecords) ? parsed.deletedRecords : []
  ).map((entry) => ({
    ...entry,
    record: migrateRecordProfileIds([entry.record])[0],
  }));

  return {
    version: parsed.version ?? DB_VERSION,
    records,
    deletedRecords,
    adminProfiles: Array.isArray(parsed.adminProfiles) ? parsed.adminProfiles : [],
    masterAccount:
      parsed.masterAccount && typeof parsed.masterAccount === "object"
        ? parsed.masterAccount
        : undefined,
    lastSyncedAt: parsed.lastSyncedAt ?? null,
  };
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

function useRedisStorage(): boolean {
  return getRedisEnv() !== null;
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
