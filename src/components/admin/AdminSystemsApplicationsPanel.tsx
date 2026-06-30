"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/drafts";
import type { StoredRecord } from "@/lib/storage/dataBins";
import {
  deleteStoredRecord,
  upsertStorageRecord,
} from "@/lib/storage/dbClient";

type SystemData = {
  title: string;
  description: string;
  hours: number;
  rate: number;
  catalog?: boolean;
};

type AdminSystemsApplicationsPanelProps = {
  records: StoredRecord[];
  loading: boolean;
  onRefresh: () => Promise<void>;
};

const EMPTY_FORM = {
  title: "",
  description: "",
  hours: "1",
  rate: 0,
};

function formatMoneyInput(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrencyInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function CurrencyInput({
  id,
  value,
  onChange,
  disabled,
  compact,
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState("");

  const handleFocus = () => {
    setFocused(true);
    setDisplay(value ? String(value) : "");
  };

  const handleBlur = () => {
    setFocused(false);
    onChange(parseCurrencyInput(display));
  };

  const handleChange = (raw: string) => {
    setDisplay(raw);
    onChange(parseCurrencyInput(raw));
  };

  return (
    <div className={compact ? "currency-wrap py-1.5" : "currency-wrap"}>
      <span className="currency-symbol">$</span>
      <input
        id={id}
        className="currency-field"
        inputMode="decimal"
        placeholder="0.00"
        disabled={disabled}
        value={focused ? display : value ? formatMoneyInput(value) : ""}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}

function parseSystem(record: StoredRecord): SystemData & { id: string } {
  const data = record.data;
  return {
    id: record.id,
    title: String(data.title ?? data.laborTitle ?? ""),
    description: String(data.description ?? ""),
    hours: Number(data.hours ?? data.laborHours) || 1,
    rate: Number(data.rate ?? data.laborRate) || 0,
    catalog: Boolean(data.catalog),
  };
}

function isCatalogEntry(record: StoredRecord): boolean {
  return (
    record.data.catalog === true || record.id.startsWith("catalog-system-")
  );
}

export default function AdminSystemsApplicationsPanel({
  records,
  loading,
  onRefresh,
}: AdminSystemsApplicationsPanelProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const systems = useMemo(
    () =>
      records
        .filter(isCatalogEntry)
        .map(parseSystem)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [records]
  );

  const stats = useMemo(() => {
    const totalValue = systems.reduce(
      (sum, item) => sum + item.hours * item.rate,
      0
    );
    const rates = systems.map((item) => item.rate).filter((rate) => rate > 0);
    const avgRate =
      rates.length > 0
        ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length
        : 0;

    return {
      count: systems.length,
      avgRate,
      totalValue,
    };
  }, [systems]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setEditForm(EMPTY_FORM);
    setError(null);
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError("System or application name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const id = `catalog-system-${crypto.randomUUID()}`;
      await upsertStorageRecord({
        id,
        binId: "labor",
        source: "admin-demo",
        data: {
          title,
          description: form.description.trim(),
          hours: parseFloat(form.hours) || 1,
          rate: form.rate,
          catalog: true,
        },
      });
      resetForm();
      setMessage(`Added "${title}" to systems | applications.`);
      await onRefresh();
    } catch {
      setError("Failed to save entry.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: SystemData & { id: string }) => {
    setEditingId(item.id);
    setEditForm({
      title: item.title,
      description: item.description,
      hours: String(item.hours),
      rate: item.rate,
    });
    setError(null);
    setMessage(null);
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId) return;

    const title = editForm.title.trim();
    if (!title) {
      setError("System or application name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await upsertStorageRecord({
        id: editingId,
        binId: "labor",
        source: "admin-demo",
        data: {
          title,
          description: editForm.description.trim(),
          hours: parseFloat(editForm.hours) || 1,
          rate: editForm.rate,
          catalog: true,
        },
      });
      resetForm();
      setMessage(`Updated "${title}".`);
      await onRefresh();
    } catch {
      setError("Failed to update entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete "${label}" from systems | applications?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await deleteStoredRecord(id);
      if (editingId === id) resetForm();
      setMessage(`Deleted "${label}".`);
      await onRefresh();
    } catch {
      setError("Failed to delete entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Systems | Applications
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{stats.count}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Avg hourly rate
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">
            {formatMoney(stats.avgRate)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Catalog value
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">
            {formatMoney(stats.totalValue)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">
          Add system or application
        </h3>

        <form
          onSubmit={handleAdd}
          className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_1fr_5.5rem_7rem_auto] sm:items-end"
        >
          <div>
            <label className="doc-label text-[10px]" htmlFor="system-title">
              Name
            </label>
            <input
              id="system-title"
              className="field py-1.5 text-sm"
              placeholder="e.g. AWS hosting"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              disabled={saving || editingId !== null}
            />
          </div>
          <div>
            <label className="doc-label text-[10px]" htmlFor="system-description">
              Description
            </label>
            <input
              id="system-description"
              className="field py-1.5 text-sm"
              placeholder="Optional details"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              disabled={saving || editingId !== null}
            />
          </div>
          <div>
            <label className="doc-label text-[10px]" htmlFor="system-hours">
              Default hrs
            </label>
            <input
              id="system-hours"
              className="field py-1.5 text-sm"
              inputMode="decimal"
              value={form.hours}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, hours: e.target.value }))
              }
              disabled={saving || editingId !== null}
            />
          </div>
          <div>
            <label className="doc-label text-[10px]" htmlFor="system-rate">
              Hourly rate
            </label>
            <CurrencyInput
              id="system-rate"
              value={form.rate}
              onChange={(rate) => setForm((prev) => ({ ...prev, rate }))}
              disabled={saving || editingId !== null}
              compact
            />
          </div>
          <button
            type="submit"
            disabled={saving || editingId !== null}
            className="btn w-full py-1.5 text-xs sm:w-auto sm:whitespace-nowrap"
          >
            {saving ? "Saving…" : "Add entry"}
          </button>
        </form>
      </div>

      {(error || message) && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            error ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-800"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            Saved systems & applications
          </h3>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-sm text-zinc-500">Loading catalog…</p>
        ) : systems.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700">No entries yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Add your first system or application above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="line-items w-full min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-left">Description</th>
                  <th className="text-center">Hrs</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {systems.map((item) =>
                  editingId === item.id ? (
                    <tr key={item.id}>
                      <td colSpan={6} className="!bg-blue-50/40 p-4">
                        <form
                          onSubmit={handleUpdate}
                          className="grid gap-3 sm:grid-cols-6"
                        >
                          <input
                            className="field sm:col-span-2"
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            placeholder="Name"
                          />
                          <input
                            className="field sm:col-span-2"
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Description"
                          />
                          <input
                            className="field"
                            value={editForm.hours}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                hours: e.target.value,
                              }))
                            }
                            placeholder="Hrs"
                          />
                          <div className="sm:col-span-1">
                            <CurrencyInput
                              value={editForm.rate}
                              onChange={(rate) =>
                                setEditForm((prev) => ({ ...prev, rate }))
                              }
                              disabled={saving}
                            />
                          </div>
                          <div className="flex gap-2 sm:col-span-6">
                            <button type="submit" disabled={saving} className="btn text-xs">
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={resetForm}
                              className="btn-outline text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={item.id}>
                      <td className="font-medium text-zinc-900">{item.title}</td>
                      <td className="text-zinc-600">{item.description || "—"}</td>
                      <td className="text-center">{item.hours}</td>
                      <td className="text-right">{formatMoney(item.rate)}</td>
                      <td className="text-right font-medium">
                        {formatMoney(item.hours * item.rate)}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            disabled={saving}
                            className="btn-outline px-2 py-1 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.title)}
                            disabled={saving}
                            className="btn-ghost text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
