"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MASTER_ADMIN_USERNAME } from "@/lib/admin-auth-constants";

type AuthMode = "sign-in" | "create";

export default function AdminSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [username, setUsername] = useState(MASTER_ADMIN_USERNAME);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCreate = mode === "create";
  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;
  const showPasswordMatchHint =
    isCreate && confirmPassword.length > 0 && password.length > 0;

  const resetForMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
    if (nextMode === "sign-in") {
      setUsername(MASTER_ADMIN_USERNAME);
    } else {
      setUsername("");
    }
  };

  const redirectAfterAuth = () => {
    const from = searchParams.get("from");
    const destination =
      from && from.startsWith("/admin") && !from.startsWith("/admin/sign-in")
        ? from
        : "/admin";
    router.replace(destination);
    router.refresh();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    if (isCreate && !passwordsMatch) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    try {
      const endpoint = isCreate
        ? "/api/admin/auth/register"
        : "/api/admin/auth/login";

      const payload = isCreate
        ? { username, password, confirmPassword }
        : { username, password, rememberMe };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error || (isCreate ? "Could not create profile." : "Sign in failed."));
        return;
      }

      redirectAfterAuth();
    } catch {
      setError(
        isCreate
          ? "Unable to create profile. Please try again."
          : "Unable to sign in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eceef1] px-6 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-zinc-50/80 px-8 py-6 text-center">
          <Image
            src="/overdrive-logo.png"
            alt="Over Drive OS"
            width={800}
            height={289}
            priority
            className="mx-auto h-14 w-auto"
          />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Dashboard access
          </p>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900">
            {isCreate ? "Create profile" : "Sign in to Invoices"}
          </h1>
          {isCreate ? (
            <p className="mt-2 text-sm text-zinc-500">
              Set up a new dashboard profile with your own username and password.
            </p>
          ) : null}
        </div>

        <div className="border-b border-zinc-100 px-8 py-4">
          <div className="segmented w-full">
            <button
              type="button"
              onClick={() => resetForMode("sign-in")}
              className={`segmented-btn flex-1 ${!isCreate ? "segmented-btn-active" : ""}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => resetForMode("create")}
              className={`segmented-btn flex-1 ${isCreate ? "segmented-btn-active" : ""}`}
            >
              Create profile
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-8 py-6">
          <div>
            <label className="doc-label" htmlFor="admin-username">
              Username
            </label>
            <input
              id="admin-username"
              className="field"
              autoComplete={isCreate ? "username" : "username"}
              placeholder={isCreate ? "e.g. jane_ops" : undefined}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div>
            <label className="doc-label" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              className="field"
              autoComplete={isCreate ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              required
            />
          </div>

          {isCreate ? (
            <div>
              <label className="doc-label" htmlFor="admin-confirm-password">
                Confirm password
              </label>
              <input
                id="admin-confirm-password"
                type="password"
                className={`field ${
                  showPasswordMatchHint
                    ? passwordsMatch
                      ? "border-emerald-300 ring-1 ring-emerald-200"
                      : "border-red-300 ring-1 ring-red-200"
                    : ""
                }`}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={submitting}
                required
              />
              {showPasswordMatchHint ? (
                <p
                  className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
                    passwordsMatch ? "text-emerald-700" : "text-red-700"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {passwordsMatch ? (
                    <>
                      <span aria-hidden>✓</span>
                      Passwords match
                    </>
                  ) : (
                    <>
                      <span aria-hidden>✕</span>
                      Passwords do not match
                    </>
                  )}
                </p>
              ) : null}
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={submitting}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
              />
              Remember me
            </label>
          )}

          {error ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="btn w-full"
            disabled={
              submitting || (isCreate && showPasswordMatchHint && !passwordsMatch)
            }
          >
            {submitting
              ? isCreate
                ? "Creating profile…"
                : "Signing in…"
              : isCreate
                ? "Create profile"
                : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
