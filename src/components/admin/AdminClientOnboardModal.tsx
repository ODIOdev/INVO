"use client";

import { useEffect, useState } from "react";
import AdminClientProfileUpload from "@/components/admin/AdminClientProfileUpload";
import AdminClientAddressCard from "@/components/admin/AdminClientAddressCard";
import AdminIcon from "@/components/admin/AdminIcons";
import { EMPTY_CLIENT_FORM, formatPhoneNumber } from "@/lib/client-form";
import { upsertStorageRecord } from "@/lib/storage/dbClient";

type AdminClientOnboardModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export default function AdminClientOnboardModal({
  open,
  onClose,
  onSaved,
}: AdminClientOnboardModalProps) {
  const [form, setForm] = useState(EMPTY_CLIENT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_CLIENT_FORM);
      setError(null);
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const initials = (() => {
    const source = (form.clientName || form.companyName || "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  })();

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
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
        id: `client-catalog-${crypto.randomUUID()}`,
        binId: "clients",
        source: "invoice-app",
        data: {
          clientName,
          companyName: form.companyName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          url: form.url.trim(),
          profileImage: form.profileImage,
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zipCode: form.zipCode.trim(),
          catalog: true,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-onboard-title"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="admin-dash-action-icon mt-0.5">
              <AdminIcon name="user-plus" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="client-onboard-title"
                className="text-base font-semibold text-zinc-900"
              >
                Add new client
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Save contact details to your client directory for quotes and
                invoices.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <AdminClientProfileUpload
            value={form.profileImage}
            onChange={(profileImage) => update("profileImage", profileImage)}
            initials={initials}
            disabled={saving}
          />
          <div>
            <label className="doc-label" htmlFor="onboard-client-name">
              Name
            </label>
            <input
              id="onboard-client-name"
              className="field"
              placeholder="Client name"
              value={form.clientName}
              onChange={(e) => update("clientName", e.target.value)}
              disabled={saving}
              autoFocus
            />
          </div>
          <div>
            <label className="doc-label" htmlFor="onboard-company">
              Company
            </label>
            <input
              id="onboard-company"
              className="field"
              placeholder="Company name"
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="doc-label" htmlFor="onboard-email">
                Email
              </label>
              <input
                id="onboard-email"
                className="field"
                type="email"
                placeholder="client@email.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label className="doc-label" htmlFor="onboard-phone">
                Phone
              </label>
              <input
                id="onboard-phone"
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
          <AdminClientAddressCard
            values={form}
            onChange={update}
            disabled={saving}
            idPrefix="onboard-address"
          />
          <div>
            <label className="doc-label" htmlFor="onboard-url">
              Website
            </label>
            <input
              id="onboard-url"
              className="field"
              placeholder="https://"
              value={form.url}
              onChange={(e) => update("url", e.target.value)}
              disabled={saving}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Saving…" : "Save client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
