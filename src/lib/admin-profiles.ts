import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { AdminProfile, AdminRole } from "@/lib/admin-auth-constants";
import { MASTER_ADMIN_USERNAME } from "@/lib/admin-auth-constants";
import { loadDatabase, saveDatabase } from "@/lib/storage/databaseStore";
import { recordProfileId } from "@/lib/storage/storage-scope";

export type StoredAdminProfile = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  password?: string;
  email?: string;
  website?: string;
  logo?: string;
  role: Extract<AdminRole, "user">;
  createdAt: string;
};

const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export function normalizeAdminUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidAdminUsername(username: string): boolean {
  const normalized = normalizeAdminUsername(username);
  if (normalized === MASTER_ADMIN_USERNAME) return false;
  return USERNAME_PATTERN.test(normalized);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function hashAdminPassword(password: string): string {
  return hashPassword(password);
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  } catch {
    return false;
  }
}

export function verifyAdminPassword(password: string, stored: string): boolean {
  return verifyPassword(password, stored);
}

export async function findAdminProfileById(
  profileId: string
): Promise<StoredAdminProfile | null> {
  const profiles = await listAdminProfiles();
  return profiles.find((profile) => profile.id === profileId) ?? null;
}

export async function getAdminProfilePassword(
  profileId: string
): Promise<string | null> {
  const profile = await findAdminProfileById(profileId);
  return profile?.password?.trim() || null;
}

export async function listAdminProfiles(): Promise<StoredAdminProfile[]> {
  const db = await loadDatabase();
  return db.adminProfiles ?? [];
}

export async function findAdminProfileByUsername(
  username: string
): Promise<StoredAdminProfile | null> {
  const normalized = normalizeAdminUsername(username);
  const profiles = await listAdminProfiles();
  return profiles.find((profile) => profile.username === normalized) ?? null;
}

export async function verifyStoredAdminCredentials(
  username: string,
  password: string
): Promise<StoredAdminProfile | null> {
  const profile = await findAdminProfileByUsername(username);
  if (!profile) return null;
  if (!verifyPassword(password, profile.passwordHash)) return null;

  if (!profile.password) {
    const db = await loadDatabase();
    const index = (db.adminProfiles ?? []).findIndex(
      (entry) => entry.id === profile.id
    );
    if (index >= 0) {
      db.adminProfiles![index] = {
        ...db.adminProfiles![index],
        password,
      };
      await saveDatabase(db);
      return db.adminProfiles![index];
    }
  }

  return profile;
}

export async function createAdminProfile(input: {
  username: string;
  displayName: string;
  password: string;
}): Promise<{ profile: StoredAdminProfile } | { error: string }> {
  const username = normalizeAdminUsername(input.username);
  const displayName = input.displayName.trim() || username;
  const password = input.password;

  if (!isValidAdminUsername(username)) {
    return {
      error:
        "Username must be 3–32 characters and use lowercase letters, numbers, or underscores. “admin” is reserved.",
    };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const db = await loadDatabase();
  const profiles = db.adminProfiles ?? [];

  if (profiles.some((profile) => profile.username === username)) {
    return { error: "That username is already taken." };
  }

  const profile: StoredAdminProfile = {
    id: `admin-profile-${crypto.randomUUID()}`,
    username,
    displayName,
    passwordHash: hashPassword(password),
    password,
    role: "user",
    createdAt: new Date().toISOString(),
  };

  db.adminProfiles = [...profiles, profile];
  await saveDatabase(db);

  return { profile };
}

export type AdminProfileListItem = {
  id: string;
  username: string;
  displayName: string;
  password: string | null;
  createdAt: string;
};

export function toAdminProfileListItem(
  profile: StoredAdminProfile
): AdminProfileListItem {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    password: profile.password ?? null,
    createdAt: profile.createdAt,
  };
}

export async function listAdminProfileSummaries(): Promise<AdminProfileListItem[]> {
  const profiles = await listAdminProfiles();
  return profiles
    .map(toAdminProfileListItem)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function deleteAdminProfile(
  profileId: string
): Promise<{ deletedRecords: number } | { error: string }> {
  const db = await loadDatabase();
  const profiles = db.adminProfiles ?? [];
  const target = profiles.find((profile) => profile.id === profileId);

  if (!target) {
    return { error: "Profile not found." };
  }

  const deletedRecords = db.records.filter(
    (record) => recordProfileId(record) === profileId
  ).length;

  db.adminProfiles = profiles.filter((profile) => profile.id !== profileId);
  db.records = db.records.filter(
    (record) => recordProfileId(record) !== profileId
  );
  db.deletedRecords = db.deletedRecords.filter(
    (entry) => recordProfileId(entry.record) !== profileId
  );

  await saveDatabase(db);

  return { deletedRecords };
}

export function storedProfileToSessionProfile(
  profile: StoredAdminProfile
): AdminProfile {
  return {
    username: profile.username,
    role: profile.role,
    displayName: profile.displayName,
    profileId: profile.id,
  };
}
