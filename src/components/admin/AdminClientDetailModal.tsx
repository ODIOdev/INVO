"use client";

import { useEffect, useMemo, useState } from "react";
import AdminClientProfileUpload, {
  AdminClientAvatar,
} from "@/components/admin/AdminClientProfileUpload";
import AdminIcon from "@/components/admin/AdminIcons";
import {
  clientCatalogFromRecord,
  computeClientBalanceStats,
  getClientDocuments,
  type ClientBalanceStats,
  type ClientDocumentRow,
} from "@/lib/client-balances";
import {
  EMPTY_CLIENT_FORM,
  formatPhoneNumber,
  type ClientFormData,
} from "@/lib/client-form";
import { formatMoney } from "@/lib/drafts";
import type { StoredRecord } from "@/lib/storage/dataBins";
import { deleteStoredRecord, upsertStorageRecord } from "@/lib/storage/dbClient";

type AdminClientDetailModalProps = {
  client: StoredRecord | null;
  draftRecords: StoredRecord[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
};

function catalogToForm(record: StoredRecord): ClientFormData {
  const catalog = clientCatalogFromRecord(record);
  return {
    clientName: catalog.clientName,
    companyName: catalog.companyName,
    email: catalog.email,
    phone: catalog.phone,
    url: catalog.url,
    profileImage: catalog.profileImage,
  };
}

function clientInitials(clientName: string, companyName: string): string {
  const source = (clientName || companyName || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatDocDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusClass(status: ClientDocumentRow["status"]): string {
  switch (status) {
    case "Open":
      return "text-amber-700";
    case "Closed":
      return "text-emerald-700";
    case "Overdue":
      return "text-rose-700";
    default:
      return "text-blue-700";
  }
}

const DOC_GRID =
  "grid grid-cols-[4.5rem_5.5rem_minmax(0,1fr)_5.5rem_4.5rem_4.5rem] gap-2";

function ClientDocumentsTable({ documents }: { documents: ClientDocumentRow[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-200">
      <div
        className={`${DOC_GRID} sticky top-0 border-b border-zinc-300 bg-zinc-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600`}
      >
        <span>Type</span>
        <span>Number</span>
        <span>Project</span>
        <span className="text-right">Date</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Status</span>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {documents.length === 0 ? (
          <p className="bg-white px-3 py-6 text-center text-xs text-zinc-500">
            No invoices or quotes linked to this client yet.
          </p>
        ) : (
          documents.map((doc, index) => (
            <div
              key={doc.id}
              className={`${DOC_GRID} items-center border-b border-zinc-200 px-3 py-2 text-xs last:border-b-0 ${
                index % 2 === 0 ? "bg-white" : "bg-zinc-50"
              }`}
            >
              <span className="font-medium text-zinc-700">{doc.docType}</span>
              <span className="truncate tabular-nums text-zinc-600">
                {doc.documentNumber}
              </span>
              <span className="truncate text-zinc-600">{doc.projectName}</span>
              <span className="truncate text-right tabular-nums text-zinc-500">
                {formatDocDate(doc.issueDate)}
              </span>
              <span className="text-right font-medium tabular-nums text-zinc-800">
                {formatMoney(
                  doc.docType === "Invoice" && doc.balanceDue > 0.01
                    ? doc.balanceDue
                    : doc.amount
                )}
              </span>
              <span
                className={`text-right text-[10px] font-semibold uppercase tracking-wide ${statusClass(doc.status)}`}
              >
                {doc.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BalanceStat({
  label,
  amount,
  count,
  accent,
}: {
  label: string;
  amount: number;
  count: number;
  accent: "amber" | "emerald" | "rose";
}) {
  const accentClass =
    accent === "amber"
      ? "from-amber-50/80 to-white border-amber-100"
      : accent === "emerald"
        ? "from-emerald-50/80 to-white border-emerald-100"
        : "from-rose-50/80 to-white border-rose-100";

  const valueClass =
    accent === "amber"
      ? "text-amber-700"
      : accent === "emerald"
        ? "text-emerald-700"
        : "text-rose-700";

  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 ${accentClass}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${valueClass}`}>
        {formatMoney(amount)}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {count} invoice{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default function AdminClientDetailModal({
  client,
  draftRecords,
  onClose,
  onSaved,
  onDeleted,
}: AdminClientDetailModalProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState<ClientFormData>(EMPTY_CLIENT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalog = useMemo(
    () => (client ? clientCatalogFromRecord(client) : null),
    [client]
  );

  const balances: ClientBalanceStats = useMemo(() => {
    if (!catalog) {
      return {
        openBalance: 0,
        closedBalance: 0,
        overdueBalance: 0,
        openCount: 0,
        closedCount: 0,
        overdueCount: 0,
      };
    }
    return computeClientBalanceStats(catalog, draftRecords);
  }, [catalog, draftRecords]);

  const documents = useMemo(() => {
    if (!catalog) return [];
    return getClientDocuments(catalog, draftRecords);
  }, [catalog, draftRecords]);

  useEffect(() => {
    if (!client) return;
    setMode("view");
    setForm(catalogToForm(client));
    setError(null);
    setSaving(false);
    setDeleting(false);
  }, [client]);

  useEffect(() => {
    if (!client) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving && !deleting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [client, deleting, onClose, saving]);

  if (!client || !catalog) return null;

  const displayName =
    catalog.clientName || catalog.companyName || client.label || "Client";

  const update = (field: keyof ClientFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const clientName = form.clientName.trim();
    if (!clientName) {
      setError("Client name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await upsertStorageRecord({
        id: client.id,
        binId: "clients",
        source: client.source,
        data: {
          ...client.data,
          clientName,
          companyName: form.companyName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          url: form.url.trim(),
          profileImage: form.profileImage,
          catalog: client.data.catalog ?? true,
        },
      });
      await onSaved();
      onClose();
    } catch {
      setError("Failed to save client. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete ${displayName}? This removes the client from your directory.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteStoredRecord(client.id);
      await onDeleted();
      onClose();
    } catch {
      setError("Failed to delete client. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!saving && !deleting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-detail-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5">
          <div className="flex items-start gap-3">
            {mode === "view" ? (
              <AdminClientAvatar
                profileImage={catalog.profileImage}
                initials={clientInitials(catalog.clientName, catalog.companyName)}
                className="admin-client-profile-preview mt-0.5 shrink-0"
              />
            ) : (
              <span className="admin-dash-action-icon mt-0.5">
                <AdminIcon name="clients" size={18} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2
                id="client-detail-title"
                className="truncate text-base font-semibold text-zinc-900"
              >
                {mode === "edit" ? "Edit client" : displayName}
              </h2>
              {mode === "view" && catalog.companyName ? (
                <p className="mt-0.5 truncate text-sm text-zinc-500">
                  {catalog.companyName}
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-500">
                  {mode === "edit"
                    ? "Update contact details for this client."
                    : "Client profile and invoice balances."}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {mode === "view" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(catalogToForm(client));
                      setMode("edit");
                      setError(null);
                    }}
                    className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-700"
                    aria-label="Edit client"
                    disabled={deleting}
                  >
                    <AdminIcon name="pencil" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete client"
                    disabled={deleting}
                  >
                    <AdminIcon name="trash" size={16} />
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-700"
                aria-label="Close"
                disabled={saving || deleting}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {mode === "view" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-5 px-6 py-5">
              <dl className="grid gap-3 text-sm">
              {catalog.email ? (
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-zinc-400">Email</dt>
                  <dd className="min-w-0 truncate text-zinc-800">{catalog.email}</dd>
                </div>
              ) : null}
              {catalog.phone ? (
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-zinc-400">Phone</dt>
                  <dd className="text-zinc-800">{catalog.phone}</dd>
                </div>
              ) : null}
              {catalog.url ? (
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-zinc-400">Web</dt>
                  <dd className="min-w-0 truncate text-zinc-800">{catalog.url}</dd>
                </div>
              ) : null}
              {!catalog.email && !catalog.phone && !catalog.url ? (
                <p className="text-sm text-zinc-500">No contact details on file.</p>
              ) : null}
            </dl>

            <div className="grid gap-3 sm:grid-cols-3">
              <BalanceStat
                label="Open balance"
                amount={balances.openBalance}
                count={balances.openCount}
                accent="amber"
              />
              <BalanceStat
                label="Closed balance"
                amount={balances.closedBalance}
                count={balances.closedCount}
                accent="emerald"
              />
              <BalanceStat
                label="Overdue"
                amount={balances.overdueBalance}
                count={balances.overdueCount}
                accent="rose"
              />
            </div>

            {error ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            </div>

            <div className="mt-auto border-t border-zinc-200 bg-zinc-50/50 px-6 py-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Invoices & quotes
                </h3>
                <span className="text-[11px] tabular-nums text-zinc-400">
                  {documents.length} record{documents.length === 1 ? "" : "s"}
                </span>
              </div>
              <ClientDocumentsTable documents={documents} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 px-6 py-5">
            <AdminClientProfileUpload
              value={form.profileImage}
              onChange={(profileImage) =>
                setForm((prev) => ({ ...prev, profileImage }))
              }
              initials={clientInitials(form.clientName, form.companyName)}
              disabled={saving}
            />
            <div>
              <label className="doc-label" htmlFor="edit-client-name">
                Name
              </label>
              <input
                id="edit-client-name"
                className="field"
                placeholder="Client name"
                value={form.clientName}
                onChange={(e) => update("clientName", e.target.value)}
                disabled={saving}
                autoFocus
              />
            </div>
            <div>
              <label className="doc-label" htmlFor="edit-company">
                Company
              </label>
              <input
                id="edit-company"
                className="field"
                placeholder="Company name"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="doc-label" htmlFor="edit-email">
                  Email
                </label>
                <input
                  id="edit-email"
                  className="field"
                  type="email"
                  placeholder="client@email.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="doc-label" htmlFor="edit-phone">
                  Phone
                </label>
                <input
                  id="edit-phone"
                  className="field"
                  placeholder="(555) 555-5555"
                  value={form.phone}
                  onChange={(e) =>
                    update("phone", formatPhoneNumber(e.target.value))
                  }
                  disabled={saving}
                />
              </div>
            </div>
            <div>
              <label className="doc-label" htmlFor="edit-url">
                Website
              </label>
              <input
                id="edit-url"
                className="field"
                placeholder="https://"
                value={form.url}
                onChange={(e) => update("url", e.target.value)}
                disabled={saving}
              />
            </div>

            {error ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setForm(catalogToForm(client));
                  setMode("view");
                  setError(null);
                }}
                className="btn-outline"
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
