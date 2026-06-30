import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth-constants";
import { verifyAdminSessionToken } from "@/lib/admin-auth";
import {
  MASTER_PROFILE_ID,
  type StorageScope,
} from "@/lib/storage/storage-scope";

export async function getRequestStorageScope(): Promise<StorageScope | null> {
  const cookieStore = await cookies();
  const profile = await verifyAdminSessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );

  if (!profile) return null;

  return { profileId: profile.profileId };
}

export async function requireStorageScope(): Promise<
  StorageScope | NextResponse
> {
  const scope = await getRequestStorageScope();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return scope;
}

export function storageScopeFromProfileId(profileId: string): StorageScope {
  return { profileId: profileId || MASTER_PROFILE_ID };
}
