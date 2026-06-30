import {
  MASTER_ADMIN_PROFILE,
  MASTER_ADMIN_USERNAME,
  MASTER_PROFILE_ID,
  type AdminProfile,
} from "@/lib/admin-auth-constants";
import {
  findAdminProfileById,
  hashAdminPassword,
  verifyAdminPassword,
} from "@/lib/admin-profiles";
import { loadDatabase, saveDatabase } from "@/lib/storage/databaseStore";

export type AdminAccountSettings = {
  username: string;
  displayName: string;
  email: string;
  website: string;
  logo: string;
};

export type StoredMasterAccount = {
  displayName?: string;
  email?: string;
  website?: string;
  logo?: string;
  passwordHash?: string;
  password?: string;
};

export type AdminAccountUpdateInput = {
  displayName?: string;
  email?: string;
  website?: string;
  logo?: string;
};

function normalizeWebsite(value: string): string {
  return value.trim();
}

function normalizeEmail(value: string): string {
  return value.trim();
}

function masterSettingsFromDb(
  masterAccount: StoredMasterAccount | undefined
): AdminAccountSettings {
  return {
    username: MASTER_ADMIN_USERNAME,
    displayName:
      masterAccount?.displayName?.trim() || MASTER_ADMIN_PROFILE.displayName,
    email: masterAccount?.email?.trim() || "",
    website: masterAccount?.website?.trim() || "",
    logo: masterAccount?.logo || "",
  };
}

export async function getAdminAccountSettings(
  profile: AdminProfile
): Promise<AdminAccountSettings> {
  if (profile.role === "master") {
    const db = await loadDatabase();
    return masterSettingsFromDb(db.masterAccount);
  }

  const stored = await findAdminProfileById(profile.profileId);
  if (!stored) {
    return {
      username: profile.username,
      displayName: profile.displayName,
      email: "",
      website: "",
      logo: "",
    };
  }

  return {
    username: stored.username,
    displayName: stored.displayName,
    email: stored.email?.trim() || "",
    website: stored.website?.trim() || "",
    logo: stored.logo || "",
  };
}

export async function updateAdminAccountSettings(
  profile: AdminProfile,
  input: AdminAccountUpdateInput
): Promise<{ settings: AdminAccountSettings; displayName: string } | { error: string }> {
  const displayName = input.displayName?.trim();
  if (displayName !== undefined && !displayName) {
    return { error: "Name is required." };
  }

  const db = await loadDatabase();

  if (profile.role === "master") {
    const current = db.masterAccount ?? {};
    db.masterAccount = {
      ...current,
      displayName: displayName ?? current.displayName ?? MASTER_ADMIN_PROFILE.displayName,
      email:
        input.email !== undefined
          ? normalizeEmail(input.email)
          : current.email ?? "",
      website:
        input.website !== undefined
          ? normalizeWebsite(input.website)
          : current.website ?? "",
      logo: input.logo !== undefined ? input.logo : current.logo ?? "",
    };
    await saveDatabase(db);
    const settings = masterSettingsFromDb(db.masterAccount);
    return { settings, displayName: settings.displayName };
  }

  const index = (db.adminProfiles ?? []).findIndex(
    (entry) => entry.id === profile.profileId
  );
  if (index < 0) {
    return { error: "Profile not found." };
  }

  const stored = db.adminProfiles![index];
  const nextDisplayName = displayName ?? stored.displayName;

  db.adminProfiles![index] = {
    ...stored,
    displayName: nextDisplayName,
    email:
      input.email !== undefined ? normalizeEmail(input.email) : stored.email ?? "",
    website:
      input.website !== undefined
        ? normalizeWebsite(input.website)
        : stored.website ?? "",
    logo: input.logo !== undefined ? input.logo : stored.logo ?? "",
  };

  await saveDatabase(db);

  return {
    settings: {
      username: stored.username,
      displayName: nextDisplayName,
      email: db.adminProfiles![index].email ?? "",
      website: db.adminProfiles![index].website ?? "",
      logo: db.adminProfiles![index].logo ?? "",
    },
    displayName: nextDisplayName,
  };
}

async function verifyCurrentPassword(
  profile: AdminProfile,
  currentPassword: string
): Promise<boolean> {
  if (profile.role === "master") {
    const db = await loadDatabase();
    if (db.masterAccount?.passwordHash) {
      return verifyAdminPassword(currentPassword, db.masterAccount.passwordHash);
    }
    const envPassword =
      process.env.ADMIN_PASSWORD?.trim() || "147896325";
    if (currentPassword.length !== envPassword.length) return false;
    let result = 0;
    for (let i = 0; i < currentPassword.length; i += 1) {
      result |= currentPassword.charCodeAt(i) ^ envPassword.charCodeAt(i);
    }
    return result === 0;
  }

  const stored = await findAdminProfileById(profile.profileId);
  if (!stored) return false;
  return verifyAdminPassword(currentPassword, stored.passwordHash);
}

export async function changeAdminAccountPassword(
  profile: AdminProfile,
  input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }
): Promise<{ ok: true } | { error: string }> {
  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword;
  const confirmPassword = input.confirmPassword;

  if (!currentPassword) {
    return { error: "Enter your current password." };
  }

  if (newPassword.length < 6) {
    return { error: "New password must be at least 6 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const validCurrent = await verifyCurrentPassword(profile, currentPassword);
  if (!validCurrent) {
    return { error: "Current password is incorrect." };
  }

  const db = await loadDatabase();
  const passwordHash = hashAdminPassword(newPassword);

  if (profile.role === "master") {
    db.masterAccount = {
      ...(db.masterAccount ?? {}),
      passwordHash,
      password: newPassword,
    };
    await saveDatabase(db);
    return { ok: true };
  }

  const index = (db.adminProfiles ?? []).findIndex(
    (entry) => entry.id === profile.profileId
  );
  if (index < 0) {
    return { error: "Profile not found." };
  }

  db.adminProfiles![index] = {
    ...db.adminProfiles![index],
    passwordHash,
    password: newPassword,
  };

  await saveDatabase(db);
  return { ok: true };
}

export async function getMasterPasswordHash(): Promise<string | null> {
  const db = await loadDatabase();
  return db.masterAccount?.passwordHash ?? null;
}

export function isMasterProfileId(profileId: string): boolean {
  return profileId === MASTER_PROFILE_ID;
}
