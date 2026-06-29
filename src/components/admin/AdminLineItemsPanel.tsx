"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/drafts";
import type { StoredRecord } from "@/lib/storage/dataBins";
import {
  deleteStoredRecord,
  upsertStorageRecord,
} from "@/lib/storage/dbClient";

type LineItemData = {
  service: string;
  description: string;
  quantity: number;
  unitPrice: number;
  catalog?: boolean;
};

type AdminLineItemsPanelProps = {
  records: StoredRecord[];
  loading: boolean;
  onRefresh: () => Promise<void>;
};

const EMPTY_FORM = {
  service: "",
  description: "",
  quantity: "1",
  unitPrice: 0,
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

function parseLineItem(record: StoredRecord): LineItemData & { id: string } {
  const data = record.data;
  return {
    id: record.id,
    service: String(data.service ?? data.name ?? ""),
    description: String(data.description ?? ""),
    quantity: Number(data.quantity) || 1,
    unitPrice: Number(data.unitPrice) || 0,
    catalog: Boolean(data.catalog),
  };
}

export default function AdminLineItemsPanel({
  records,
  loading,
  onRefresh,
}: AdminLineItemsPanelProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const lineItems = useMemo(
    () =>
      records
        .map(parseLineItem)
        .sort((a, b) => a.service.localeCompare(b.service)),
    [records]
  );

  const stats = useMemo(() => {
    const totalValue = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const prices = lineItems.map((item) => item.unitPrice).filter((p) => p > 0);
    const avgPrice =
      prices.length > 0
        ? prices.reduce((sum, price) => sum + price, 0) / prices.length
        : 0;

    return {
      count: lineItems.length,
      avgPrice,
      totalValue,
    };
  }, [lineItems]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setEditForm(EMPTY_FORM);
    setError(null);
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const service = form.service.trim();
    if (!service) {
      setError("Service name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const id = `catalog-line-${crypto.randomUUID()}`;
      await upsertStorageRecord({
        id,
        binId: "lineItems",
        source: "admin-demo",
        data: {
          service,
          description: form.description.trim(),
          quantity: parseFloat(form.quantity) || 1,
          unitPrice: form.unitPrice,
          catalog: true,
        },
      });
      resetForm();
      setMessage(`Added "${service}" to line items.`);
      await onRefresh();
    } catch {
      setError("Failed to save line item.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: LineItemData & { id: string }) => {
    setEditingId(item.id);
    setEditForm({
      service: item.service,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: item.unitPrice,
    });
    setError(null);
    setMessage(null);
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId) return;

    const service = editForm.service.trim();
    if (!service) {
      setError("Service name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await upsertStorageRecord({
        id: editingId,
        binId: "lineItems",
        source: "admin-demo",
        data: {
          service,
          description: editForm.description.trim(),
          quantity: parseFloat(editForm.quantity) || 1,
          unitPrice: editForm.unitPrice,
          catalog: true,
        },
      });
      resetForm();
      setMessage(`Updated "${service}".`);
      await onRefresh();
    } catch {
      setError("Failed to update line item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete "${label}" from line items?`)) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await deleteStoredRecord(id);
      if (editingId === id) resetForm();
      setMessage(`Deleted "${label}".`);
      await onRefresh();
    } catch {
      setError("Failed to delete line item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Line items
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{stats.count}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Avg unit price
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">
            {formatMoney(stats.avgPrice)}
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
        <h3 className="text-sm font-semibold text-zinc-900">Add line item</h3>

        <form
          onSubmit={handleAdd}
          className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_1fr_5.5rem_7rem_auto] sm:items-end"
        >
          <div>
            <label className="doc-label text-[10px]" htmlFor="line-service">
              Service
            </label>
            <input
              id="line-service"
              className="field py-1.5 text-sm"
              placeholder="e.g. Web design"
              value={form.service}
              onChange={(e) => setForm((prev) => ({ ...prev, service: e.target.value }))}
              disabled={saving || editingId !== null}
            />
          </div>
          <div>
            <label className="doc-label text-[10px]" htmlFor="line-description">
              Description
            </label>
            <input
              id="line-description"
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
            <label className="doc-label text-[10px]" htmlFor="line-qty">
              Default qty
            </label>
            <input
              id="line-qty"
              className="field py-1.5 text-sm"
              inputMode="decimal"
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              disabled={saving || editingId !== null}
            />
          </div>
          <div>
            <label className="doc-label text-[10px]" htmlFor="line-price">
              Unit price
            </label>
            <CurrencyInput
              id="line-price"
              value={form.unitPrice}
              onChange={(unitPrice) =>
                setForm((prev) => ({ ...prev, unitPrice }))
              }
              disabled={saving || editingId !== null}
              compact
            />
          </div>
          <button
            type="submit"
            disabled={saving || editingId !== null}
            className="btn w-full py-1.5 text-xs sm:w-auto sm:whitespace-nowrap"
          >
            {saving ? "Saving…" : "Add line item"}
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
          <h3 className="text-sm font-semibold text-zinc-900">Saved line items</h3>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-sm text-zinc-500">Loading line items…</p>
        ) : lineItems.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700">No line items yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Add your first service and price above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="line-items w-full min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left">Service</th>
                  <th className="text-left">Description</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) =>
                  editingId === item.id ? (
                    <tr key={item.id}>
                      <td colSpan={6} className="!bg-blue-50/40 p-4">
                        <form
                          onSubmit={handleUpdate}
                          className="grid gap-3 sm:grid-cols-6"
                        >
                          <input
                            className="field sm:col-span-2"
                            value={editForm.service}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                service: e.target.value,
                              }))
                            }
                            placeholder="Service"
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
                            value={editForm.quantity}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                quantity: e.target.value,
                              }))
                            }
                            placeholder="Qty"
                          />
                          <div className="sm:col-span-1">
                            <CurrencyInput
                              value={editForm.unitPrice}
                              onChange={(unitPrice) =>
                                setEditForm((prev) => ({ ...prev, unitPrice }))
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
                      <td className="font-medium text-zinc-900">{item.service}</td>
                      <td className="text-zinc-600">{item.description || "—"}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">{formatMoney(item.unitPrice)}</td>
                      <td className="text-right font-medium">
                        {formatMoney(item.quantity * item.unitPrice)}
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
                            onClick={() => handleDelete(item.id, item.service)}
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
