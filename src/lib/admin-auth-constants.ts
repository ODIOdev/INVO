export const ADMIN_SESSION_COOKIE = "overdrive-admin-session";
export const MASTER_ADMIN_USERNAME = "admin";

export type AdminRole = "master" | "user";

export type AdminProfile = {
  username: string;
  role: AdminRole;
  displayName: string;
  profileId: string;
};

export const MASTER_PROFILE_ID = "master";

export const MASTER_ADMIN_PROFILE: AdminProfile = {
  username: MASTER_ADMIN_USERNAME,
  role: "master",
  displayName: "admin",
  profileId: MASTER_PROFILE_ID,
};
