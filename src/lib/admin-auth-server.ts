import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  MASTER_ADMIN_PROFILE,
  MASTER_ADMIN_USERNAME,
  type AdminProfile,
} from "@/lib/admin-auth-constants";
import { getMasterPasswordHash } from "@/lib/admin-account";
import { verifyAdminSessionToken } from "@/lib/admin-auth";
import {
  storedProfileToSessionProfile,
  verifyAdminPassword,
  verifyStoredAdminCredentials,
} from "@/lib/admin-profiles";

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "147896325";
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function verifyMasterAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  if (username.trim().toLowerCase() !== MASTER_ADMIN_USERNAME) return false;

  const storedHash = await getMasterPasswordHash();
  if (storedHash) {
    return verifyAdminPassword(password, storedHash);
  }

  return safeEqual(password, getAdminPassword());
}

export async function getAdminSessionProfile(): Promise<AdminProfile | null> {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );
}

export async function requireMasterAdmin(): Promise<AdminProfile | NextResponse> {
  const profile = await getAdminSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (profile.role !== "master") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return profile;
}

export async function profileFromCredentials(
  username: string,
  password: string
): Promise<AdminProfile | null> {
  if (await verifyMasterAdminCredentials(username, password)) {
    return MASTER_ADMIN_PROFILE;
  }

  const stored = await verifyStoredAdminCredentials(username, password);
  if (!stored) return null;
  return storedProfileToSessionProfile(stored);
}
