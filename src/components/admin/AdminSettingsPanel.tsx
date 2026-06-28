"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { masterResetDatabase } from "@/lib/storage/dbClient";

type AdminSettingsPanelProps = {
  backend: "redis" | "local";
  totalRecords: number;
  stripeConfigured: boolean;
  emailConfigured: boolean;
  emailProvider: string | null;
};

export default function AdminSettingsPanel({
  backend,
  totalRecords,
  stripeConfigured,
  emailConfigured,
  emailProvider,
}: AdminSettingsPanelProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMasterReset = async () => {
    if (
      !window.confirm(
        "This permanently deletes ALL data in the database — clients, drafts, invoices, line items, labor, and notes. This cannot be undone."
      )
    ) {
      return;
    }

    if (confirmText !== "RESET") {
      setError('Type "RESET" to confirm.');
      return;
    }

    setResetting(true);
    setMessage(null);
    setError(null);

    try {
      await masterResetDatabase();
      setMessage("Database reset complete. All records have been deleted.");
      setConfirmText("");
      router.refresh();
    } catch {
      setError("Master reset failed. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eceef1]">
      <header className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Over Drive OS Admin
            </p>
            <h1 className="text-lg font-semibold text-zinc-900">Settings</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="btn-outline text-xs">
              Back to Admin
            </Link>
            <Link href="/" className="btn-outline text-xs">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Storage</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Current database backend and record count.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-zinc-50 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Backend
              </dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-900">
                {backend === "redis" ? "Vercel Cloud (Redis)" : "Local file"}
              </dd>
            </div>
            <div className="rounded-md bg-zinc-50 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Total records
              </dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-900">
                {totalRecords}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Email</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sends HTML invoices from{" "}
            <span className="font-mono">admin@overdriveio.com</span> via
            Hostinger SMTP (recommended) or Resend.
          </p>
          <dl className="mt-4 space-y-3">
            <div className="rounded-md bg-zinc-50 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Delivery
              </dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-900">
                {emailConfigured
                  ? `Connected (${emailProvider})`
                  : "Not configured"}
              </dd>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
              <p className="font-semibold text-zinc-800">
                Hostinger SMTP (send to any client)
              </p>
              <p className="mt-2">
                Add these in Vercel environment variables:
              </p>
              <ul className="mt-2 space-y-1 font-mono text-[11px] text-zinc-700">
                <li>SMTP_HOST=smtp.hostinger.com</li>
                <li>SMTP_PORT=465</li>
                <li>SMTP_SECURE=true</li>
                <li>SMTP_USER=admin@overdriveio.com</li>
                <li>SMTP_PASS=your email password</li>
                <li>
                  EMAIL_FROM=Over Drive OS &lt;admin@overdriveio.com&gt;
                </li>
              </ul>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Payments</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Stripe Checkout links are added to invoice emails when configured.
          </p>
          <dl className="mt-4">
            <div className="rounded-md bg-zinc-50 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Stripe
              </dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-900">
                {stripeConfigured ? "Connected" : "Not configured"}
              </dd>
              {!stripeConfigured && (
                <p className="mt-2 text-xs text-zinc-500">
                  Add <span className="font-mono">STRIPE_SECRET_KEY</span> to
                  your environment variables.
                </p>
              )}
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Master reset wipes the entire internal database — all bins, all
            records, and local saved drafts on this device.
          </p>

          {message && (
            <div className="mt-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-800">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="mt-5 space-y-3">
            <label className="block text-sm font-medium text-zinc-700">
              Type <span className="font-mono text-red-600">RESET</span> to
              confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="RESET"
              className="field max-w-xs"
              disabled={resetting}
            />
          </div>

          <button
            type="button"
            onClick={handleMasterReset}
            disabled={resetting || confirmText !== "RESET"}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resetting ? "Resetting…" : "Master Reset Database"}
          </button>
        </section>
      </div>
    </div>
  );
}
