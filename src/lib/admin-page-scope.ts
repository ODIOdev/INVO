import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, type AdminProfile } from "@/lib/admin-auth-constants";
import { verifyAdminSessionToken } from "@/lib/admin-auth";
import { getRequestStorageScope } from "@/lib/storage/storage-auth";
import type { StorageScope } from "@/lib/storage/storage-scope";

export async function getAdminPageProfile(): Promise<AdminProfile> {
  const cookieStore = await cookies();
  const profile = await verifyAdminSessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );
  if (!profile) {
    redirect("/admin/sign-in");
  }
  return profile;
}

export async function getAdminPageStorageScope(): Promise<StorageScope> {
  const scope = await getRequestStorageScope();
  if (!scope) {
    redirect("/admin/sign-in");
  }
  return scope;
}
