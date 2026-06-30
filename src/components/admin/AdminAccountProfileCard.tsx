"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import AdminClientProfileUpload from "@/components/admin/AdminClientProfileUpload";
import type { AdminAccountSettings } from "@/lib/admin-account";

type AdminAccountProfileCardProps = {
  initialSettings: AdminAccountSettings;
};

function profileInitials(displayName: string, username: string): string {
  const source = (displayName || username || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export default function AdminAccountProfileCard({
  initialSettings,
}: AdminAccountProfileCardProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [displayName, setDisplayName] = useState(initialSettings.displayName);
  const [email, setEmail] = useState(initialSettings.email);
  const [website, setWebsite] = useState(initialSettings.website);
  const [logo, setLogo] = useState(initialSettings.logo);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const initials = useMemo(
    () => profileInitials(displayName, settings.username),
    [displayName, settings.username]
  );

  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      const response = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          displayName,
          email,
          website,
          logo,
        }),
      });

      const data = (await response.json()) as {
        settings?: AdminAccountSettings;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save profile.");
      }

      if (data.settings) {
        setSettings(data.settings);
        setDisplayName(data.settings.displayName);
        setEmail(data.settings.email);
        setWebsite(data.settings.website);
        setLogo(data.settings.logo);
      }

      setProfileMessage("Profile saved.");
      router.refresh();
    } catch (caught) {
      setProfileError(
        caught instanceof Error ? caught.message : "Failed to save profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordMessage(null);
    setPasswordError(null);

    if (!passwordsMatch) {
      setPasswordError("New passwords do not match.");
      setSavingPassword(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to change password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    } catch (caught) {
      setPasswordError(
        caught instanceof Error ? caught.message : "Failed to change password."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="admin-settings-card">
      <div className="flex items-start gap-3">
        <span className="admin-dash-action-icon mt-0.5 shrink-0">
          <span className="text-sm font-semibold text-zinc-600">{initials}</span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-zinc-900">Profile</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Your account logo, contact details, and password.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="mt-5 space-y-4 border-t border-zinc-100 pt-5">
        <div>
          <p className="doc-label">Logo</p>
          <AdminClientProfileUpload
            value={logo}
            onChange={setLogo}
            initials={initials}
            disabled={savingProfile}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="doc-label" htmlFor="account-username">
              Username
            </label>
            <input
              id="account-username"
              className="field bg-zinc-50 text-zinc-500"
              value={settings.username}
              readOnly
              disabled
            />
          </div>
          <div>
            <label className="doc-label" htmlFor="account-name">
              Name
            </label>
            <input
              id="account-name"
              className="field"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={savingProfile}
              required
            />
          </div>
          <div>
            <label className="doc-label" htmlFor="account-email">
              Email
            </label>
            <input
              id="account-email"
              className="field"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={savingProfile}
            />
          </div>
          <div>
            <label className="doc-label" htmlFor="account-website">
              Website
            </label>
            <input
              id="account-website"
              className="field"
              placeholder="https://"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              disabled={savingProfile}
            />
          </div>
        </div>

        {profileError ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {profileError}
          </p>
        ) : null}
        {profileMessage ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {profileMessage}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button type="submit" className="btn text-sm" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>

      <form
        onSubmit={handleChangePassword}
        className="mt-6 space-y-4 border-t border-zinc-100 pt-5"
      >
        <div>
          <h4 className="text-sm font-semibold text-zinc-900">Change password</h4>
          <p className="mt-1 text-xs text-zinc-500">
            Enter your current password, then choose a new one.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="doc-label" htmlFor="account-current-password">
              Current password
            </label>
            <input
              id="account-current-password"
              type="password"
              className="field"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={savingPassword}
            />
          </div>
          <div>
            <label className="doc-label" htmlFor="account-new-password">
              New password
            </label>
            <input
              id="account-new-password"
              type="password"
              className="field"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={savingPassword}
            />
          </div>
          <div>
            <label className="doc-label" htmlFor="account-confirm-password">
              Confirm new password
            </label>
            <input
              id="account-confirm-password"
              type="password"
              className="field"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={savingPassword}
            />
          </div>
        </div>

        {confirmPassword.length > 0 && newPassword.length > 0 ? (
          <p
            className={`text-xs font-medium ${
              passwordsMatch ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {passwordsMatch
              ? "New passwords match"
              : "New passwords do not match"}
          </p>
        ) : null}

        {passwordError ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {passwordError}
          </p>
        ) : null}
        {passwordMessage ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {passwordMessage}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-outline text-sm"
            disabled={
              savingPassword ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword ||
              !passwordsMatch
            }
          >
            {savingPassword ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </section>
  );
}
