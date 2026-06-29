"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import AdminIcon from "@/components/admin/AdminIcons";
import AdminSidebar from "@/components/admin/AdminSidebar";
import type { AdminIconName } from "@/lib/admin-icons";
import { DATA_BINS, type BinSummary, type DataBinId, type DeletedRecord } from "@/lib/storage/dataBins";
import {
  fetchDeletedRecords,
  masterResetDatabase,
  purgeAllDeletedRecords,
  restoreDeletedRecord,
} from "@/lib/storage/dbClient";

type AdminSettingsPanelProps = {
  bins: BinSummary[];
  backend: "redis" | "local";
  totalRecords: number;
  initialDeletedRecords: DeletedRecord[];
  stripeConfigured: boolean;
  emailConfigured: boolean;
  emailProvider: string | null;
  smsConfigured: boolean;
  twilioFromNumber: string | null;
};

function formatDeletedDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={`admin-settings-status-pill ${
        connected
          ? "admin-settings-status-pill-on"
          : "admin-settings-status-pill-off"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? "bg-emerald-500" : "bg-zinc-400"
        }`}
      />
      {connected ? "Connected" : "Not configured"}
    </span>
  );
}

function SettingsCard({
  title,
  description,
  icon,
  connected,
  children,
}: {
  title: string;
  description: string;
  icon: AdminIconName;
  connected: boolean;
  children?: React.ReactNode;
}) {
  return (
    <article className="admin-settings-card">
      <div className="admin-settings-card-header">
        <div className="flex min-w-0 gap-3">
          <span className="admin-dash-action-icon mt-0.5 shrink-0">
            <AdminIcon name={icon} size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
        </div>
        <StatusPill connected={connected} />
      </div>
      {children ? <div className="mt-4 pl-11">{children}</div> : null}
    </article>
  );
}

export default function AdminSettingsPanel({
  bins,
  backend,
  totalRecords,
  initialDeletedRecords,
  stripeConfigured,
  emailConfigured,
  emailProvider,
  smsConfigured,
  twilioFromNumber,
}: AdminSettingsPanelProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletedRecords, setDeletedRecords] = useState(initialDeletedRecords);
  const [trashLoading, setTrashLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [purgingAll, setPurgingAll] = useState(false);
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);

  const integrationsConnected = [
    backend === "redis",
    emailConfigured,
    stripeConfigured,
  ].filter(Boolean).length;

  const loadTrash = useCallback(async () => {
    setTrashLoading(true);
    try {
      const data = await fetchDeletedRecords();
      setDeletedRecords(data.deleted);
    } catch {
      setError("Failed to load recently deleted records.");
    } finally {
      setTrashLoading(false);
    }
  }, []);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    setError(null);
    try {
      await restoreDeletedRecord(id);
      setDeletedRecords((current) =>
        current.filter((entry) => entry.record.id !== id)
      );
      setMessage("Record restored.");
      router.refresh();
    } catch {
      setError("Failed to restore record.");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePurgeAll = async () => {
    if (
      !window.confirm(
        "Permanently delete all items in Recently Deleted? This cannot be undone."
      )
    ) {
      return;
    }

    setPurgingAll(true);
    setError(null);
    try {
      await purgeAllDeletedRecords();
      setDeletedRecords([]);
      setMessage("Recently deleted list cleared.");
      router.refresh();
    } catch {
      setError("Failed to delete all records from trash.");
    } finally {
      setPurgingAll(false);
    }
  };

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
      setDeletedRecords([]);
      router.refresh();
    } catch {
      setError("Master reset failed. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eceef1]">
      <header className="admin-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Over Drive OS Dashboard
            </p>
            <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/" className="btn-outline text-xs">
              Website
            </Link>
            <Link href="/invoice" className="btn-outline text-xs">
              Invoice App
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <AdminSidebar
          bins={bins}
          activeView="home"
          onSelectHome={() => router.push("/admin")}
          onSelectBin={(binId: DataBinId) =>
            router.push(`/admin?view=${binId}`)
          }
          onSelectIntegrations={() => router.push("/admin?view=integrations")}
        />

        <main className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="space-y-6 p-6">
            <section className="admin-settings-hero">
              <div className="admin-settings-hero-inner">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100/80">
                    Configuration
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
                    Settings
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-blue-100/80">
                    Storage, integrations, deleted records, and database controls.
                  </p>
                </div>
                <div className="admin-settings-hero-stats">
                  <div className="admin-dash-hero-stat">
                    <p className="admin-dash-hero-stat-label">Records</p>
                    <p className="admin-dash-hero-stat-value">{totalRecords}</p>
                  </div>
                  <div className="admin-dash-hero-stat">
                    <p className="admin-dash-hero-stat-label">In trash</p>
                    <p className="admin-dash-hero-stat-value">
                      {deletedRecords.length}
                    </p>
                  </div>
                  <div className="admin-dash-hero-stat">
                    <p className="admin-dash-hero-stat-label">Integrations</p>
                    <p className="admin-dash-hero-stat-value">
                      {integrationsConnected}/3
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {(message || error) && (
              <div
                className={`admin-settings-toast ${
                  error
                    ? "admin-settings-toast-error"
                    : "admin-settings-toast-success"
                }`}
              >
                {error ?? message}
              </div>
            )}

            <section className="grid gap-4 lg:grid-cols-2">
              <SettingsCard
                title="Cloud storage"
                description="Where quotes, invoices, and catalog data are stored."
                icon="cloud"
                connected={backend === "redis"}
              >
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Backend</dt>
                    <dd className="font-medium text-zinc-900">
                      {backend === "redis" ? "Vercel Cloud (Redis)" : "Local file"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Active records</dt>
                    <dd className="font-medium tabular-nums text-zinc-900">
                      {totalRecords}
                    </dd>
                  </div>
                </dl>
              </SettingsCard>

              <SettingsCard
                title="Email delivery"
                description="HTML invoices sent from admin@overdriveio.com."
                icon="mail"
                connected={emailConfigured}
              >
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Provider</dt>
                    <dd className="font-medium text-zinc-900">
                      {emailConfigured
                        ? (emailProvider ?? "Configured")
                        : "Not set up"}
                    </dd>
                  </div>
                </dl>
                {!emailConfigured ? (
                  <div className="admin-settings-env-block mt-3 text-xs text-zinc-600">
                    <p className="font-semibold text-zinc-800">
                      Hostinger SMTP variables
                    </p>
                    <ul className="mt-2 space-y-1 font-mono text-[11px] text-zinc-700">
                      <li>SMTP_HOST=smtp.hostinger.com</li>
                      <li>SMTP_PORT=465</li>
                      <li>SMTP_SECURE=true</li>
                      <li>SMTP_USER=admin@overdriveio.com</li>
                      <li>SMTP_PASS=your email password</li>
                    </ul>
                  </div>
                ) : null}
              </SettingsCard>

              <SettingsCard
                title="SMS delivery"
                description="Text quotes and invoices to clients via Twilio."
                icon="mail"
                connected={smsConfigured}
              >
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Provider</dt>
                    <dd className="font-medium text-zinc-900">
                      {smsConfigured
                        ? "Twilio"
                        : "Not set up"}
                    </dd>
                  </div>
                  {twilioFromNumber ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-500">From number</dt>
                      <dd className="font-medium text-zinc-900">
                        {twilioFromNumber}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {!smsConfigured ? (
                  <div className="admin-settings-env-block mt-3 text-xs text-zinc-600">
                    <p className="font-semibold text-zinc-800">
                      Twilio environment variables
                    </p>
                    <ul className="mt-2 space-y-1 font-mono text-[11px] text-zinc-700">
                      <li>TWILIO_ACCOUNT_SID=ACxxxxxxxx</li>
                      <li>TWILIO_AUTH_TOKEN=your auth token</li>
                      <li>TWILIO_PHONE_NUMBER=+15551234567</li>
                    </ul>
                  </div>
                ) : null}
              </SettingsCard>

              <SettingsCard
                title="Stripe payments"
                description="Checkout links in invoice emails when enabled."
                icon="credit-card"
                connected={stripeConfigured}
              >
                {!stripeConfigured ? (
                  <p className="text-xs text-zinc-500">
                    Add{" "}
                    <span className="font-mono text-zinc-700">
                      STRIPE_SECRET_KEY
                    </span>{" "}
                    to your environment variables.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-700">
                    Stripe Checkout is ready for invoice emails.
                  </p>
                )}
              </SettingsCard>

              <article className="admin-settings-card flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-3">
                    <span className="admin-dash-action-icon mt-0.5 shrink-0">
                      <AdminIcon name="integrations" size={18} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Integrations hub
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        View all connection details in one place.
                      </p>
                    </div>
                  </div>
                </div>
                <Link
                  href="/admin?view=integrations"
                  className="btn-outline mt-4 w-full text-xs sm:ml-11 sm:w-auto"
                >
                  Open integrations
                </Link>
              </article>
            </section>

            <section className="admin-settings-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Recently deleted
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Restore records or permanently remove them from trash.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadTrash()}
                  className="btn-outline px-3 py-1.5 text-xs"
                  disabled={trashLoading}
                >
                  {trashLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              <div className="admin-settings-trash-table mt-4">
                <div className="admin-settings-trash-head">
                  <span>Record</span>
                  <span className="hidden sm:block">Type</span>
                  <span>Deleted</span>
                  <span className="text-right">Action</span>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {deletedRecords.length === 0 ? (
                    <p className="bg-white px-4 py-10 text-center text-sm text-zinc-500">
                      Trash is empty — deleted records will appear here.
                    </p>
                  ) : (
                    deletedRecords.map((entry, index) => (
                      <div
                        key={entry.record.id}
                        className={`admin-settings-trash-row ${
                          index % 2 === 0 ? "bg-white" : "bg-zinc-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-900">
                            {entry.record.label}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-zinc-500 sm:hidden">
                            {DATA_BINS[entry.record.binId].label}
                          </p>
                        </div>
                        <span className="hidden truncate text-xs text-zinc-500 sm:block">
                          {DATA_BINS[entry.record.binId].label}
                        </span>
                        <span className="truncate text-xs tabular-nums text-zinc-500">
                          {formatDeletedDate(entry.deletedAt)}
                        </span>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => void handleRestore(entry.record.id)}
                            disabled={
                              restoringId === entry.record.id || purgingAll
                            }
                            className="btn-outline px-2.5 py-1 text-[11px]"
                          >
                            {restoringId === entry.record.id
                              ? "Restoring…"
                              : "Recover"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {deletedRecords.length > 0 ? (
                  <div className="admin-settings-trash-foot">
                    <p className="text-xs text-zinc-500">
                      {deletedRecords.length} item
                      {deletedRecords.length === 1 ? "" : "s"} in trash
                    </p>
                    <button
                      type="button"
                      onClick={() => void handlePurgeAll()}
                      disabled={purgingAll || restoringId !== null}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {purgingAll ? "Deleting…" : "Delete all permanently"}
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="admin-settings-danger">
              <button
                type="button"
                onClick={() => setDangerZoneOpen((open) => !open)}
                className="flex w-full items-start gap-3 text-left"
                aria-expanded={dangerZoneOpen}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <AdminIcon name="trash" size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-red-800">
                      Danger zone
                    </h3>
                    <AdminIcon
                      name="chevron-down"
                      size={16}
                      className={`shrink-0 text-red-400 transition-transform ${
                        dangerZoneOpen ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                  {!dangerZoneOpen ? (
                    <p className="mt-1 text-sm text-zinc-500">
                      Master reset — click to expand
                    </p>
                  ) : null}
                </span>
              </button>

              {dangerZoneOpen ? (
                <div className="mt-4 border-t border-red-100 pt-4 pl-12">
                  <p className="text-sm text-zinc-600">
                    Master reset wipes the entire database, trash, and local
                    saved drafts on this device.
                  </p>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label className="doc-label" htmlFor="settings-reset-confirm">
                        Type RESET to confirm
                      </label>
                      <input
                        id="settings-reset-confirm"
                        type="text"
                        value={confirmText}
                        onChange={(e) =>
                          setConfirmText(e.target.value.toUpperCase())
                        }
                        placeholder="RESET"
                        className="field mt-1 max-w-xs"
                        disabled={resetting}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleMasterReset()}
                      disabled={resetting || confirmText !== "RESET"}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resetting ? "Resetting…" : "Master reset database"}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
