"use client";

import { useEffect, useState } from "react";
import type { AdminProfile } from "@/lib/admin-auth-constants";

export default function AdminProfileTag() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { profile?: AdminProfile | null }) => {
        if (active) setProfile(data.profile ?? null);
      })
      .catch(() => {
        if (active) setProfile(null);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!profile) return null;

  return (
    <span
      className={`admin-profile-tag ${
        profile.role === "master"
          ? "admin-profile-tag-master"
          : "admin-profile-tag-user"
      }`}
    >
      {profile.displayName}
    </span>
  );
}
