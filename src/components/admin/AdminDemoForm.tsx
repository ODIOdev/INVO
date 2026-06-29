"use client";

import { useState } from "react";
import {
  DATA_BINS,
  type DataBinId,
} from "@/lib/storage/dataBins";
import { isNamedClient } from "@/lib/catalog-clients";
import {
  seedDemoDatabase,
  upsertStorageRecord,
} from "@/lib/storage/dbClient";

type AdminDemoFormProps = {
  selectedBin: DataBinId;
  onSaved: () => Promise<void>;
};

const EMPTY = {
  clientName: "",
  companyName: "",
  email: "",
  phone: "",
  url: "",
  projectName: "",
  documentNumber: "",
  docType: "Quote",
  service: "",
  description: "",
  quantity: "1",
  unitPrice: "0",
  laborTitle: "",
  laborHours: "0",
  laborRate: "0",
  notes: "",
};

export default function AdminDemoForm({
  selectedBin,
  onSaved,
}: AdminDemoFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  const update = (key: keyof typeof EMPTY, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = () => {
    const docId = crypto.randomUUID();

    switch (selectedBin) {
      case "clients":
        return {
          id: `client-${docId}`,
          data: {
            clientName: form.clientName,
            companyName: form.companyName,
            email: form.email,
            phone: form.phone,
            url: form.url,
            documentId: docId,
          },
        };
      case "documents":
        return {
          id: `doc-${docId}`,
          data: {
            docType: form.docType,
            documentNumber: form.documentNumber || `DEMO-${Date.now().toString().slice(-6)}`,
            projectName: form.projectName || "Demo project",
            draftId: docId,
          },
        };
      case "quotes":
        return {
          id: `quote-${docId}`,
          data: {
            docType: "Quote",
            documentNumber: form.documentNumber || `QTE-${Date.now().toString().slice(-6)}`,
            projectName: form.projectName || "Demo project",
            draftId: docId,
          },
        };
      case "lineItems":
        return {
          id: `line-${docId}-0`,
          data: {
            service: form.service || "Demo service",
            description: form.description,
            quantity: Number(form.quantity) || 1,
            unitPrice: Number(form.unitPrice) || 0,
            documentId: docId,
          },
        };
      case "labor":
        return {
          id: `labor-${docId}`,
          data: {
            title: form.laborTitle || "Demo labor",
            hours: Number(form.laborHours) || 0,
            rate: Number(form.laborRate) || 0,
            documentId: docId,
          },
        };
      case "notes":
        return {
          id: `notes-${docId}`,
          data: {
            notes: form.notes || "Demo notes",
            documentId: docId,
          },
        };
      default:
        return null;
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (selectedBin === "drafts") {
        await seedDemoDatabase();
      } else {
        const payload = buildPayload();
        if (!payload) {
          setError("Use Seed Demo Database for full draft records.");
          return;
        }
        if (
          selectedBin === "clients" &&
          !isNamedClient({
            clientName: form.clientName,
            companyName: form.companyName,
            email: form.email,
          })
        ) {
          setError("Enter a client name, company, or email before saving.");
          return;
        }
        await upsertStorageRecord({
          binId: selectedBin,
          ...payload,
          source: "admin-demo",
        });
      }

      setForm(EMPTY);
      await onSaved();
    } catch {
      setError("Failed to save demo record.");
    } finally {
      setSaving(false);
    }
  };

  const handleSeedAll = async () => {
    if (
      !window.confirm(
        "Seed the database with a full demo quote across all bins?"
      )
    ) {
      return;
    }

    setSeeding(true);
    setError(null);
    try {
      await seedDemoDatabase();
      await onSaved();
    } catch {
      setError("Failed to seed demo database.");
    } finally {
      setSeeding(false);
    }
  };

  const bin = DATA_BINS[selectedBin];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Demo Form
          </p>
          <p className="mt-0.5 text-sm font-medium text-zinc-900">
            Add data to {bin.label}
          </p>
        </div>
        <span className="text-xs text-zinc-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          {selectedBin === "clients" && (
            <>
              <input className="field" placeholder="Client name" value={form.clientName} onChange={(e) => update("clientName", e.target.value)} />
              <input className="field" placeholder="Company" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} />
              <input className="field" placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              <input className="field" placeholder="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              <input className="field" placeholder="Website" value={form.url} onChange={(e) => update("url", e.target.value)} />
            </>
          )}

          {selectedBin === "documents" && (
            <>
              <select className="field" value={form.docType} onChange={(e) => update("docType", e.target.value)}>
                <option value="Quote">Quote</option>
                <option value="Invoice">Invoice</option>
              </select>
              <input className="field" placeholder="Document number" value={form.documentNumber} onChange={(e) => update("documentNumber", e.target.value)} />
              <input className="field" placeholder="Project name" value={form.projectName} onChange={(e) => update("projectName", e.target.value)} />
            </>
          )}

          {selectedBin === "quotes" && (
            <>
              <input className="field" placeholder="Quote number" value={form.documentNumber} onChange={(e) => update("documentNumber", e.target.value)} />
              <input className="field" placeholder="Project name" value={form.projectName} onChange={(e) => update("projectName", e.target.value)} />
            </>
          )}

          {selectedBin === "lineItems" && (
            <>
              <input className="field" placeholder="Service" value={form.service} onChange={(e) => update("service", e.target.value)} />
              <input className="field" placeholder="Description" value={form.description} onChange={(e) => update("description", e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input className="field" placeholder="Qty" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
                <input className="field" placeholder="Rate" value={form.unitPrice} onChange={(e) => update("unitPrice", e.target.value)} />
              </div>
            </>
          )}

          {selectedBin === "labor" && (
            <>
              <input className="field" placeholder="Title" value={form.laborTitle} onChange={(e) => update("laborTitle", e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input className="field" placeholder="Hours" value={form.laborHours} onChange={(e) => update("laborHours", e.target.value)} />
                <input className="field" placeholder="Rate" value={form.laborRate} onChange={(e) => update("laborRate", e.target.value)} />
              </div>
            </>
          )}

          {selectedBin === "notes" && (
            <textarea className="field min-h-[80px] resize-y" placeholder="Notes & terms" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          )}

          {selectedBin === "drafts" && (
            <p className="text-sm text-zinc-500">
              Saves a complete demo quote with client, line items, labor, and notes across all bins.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex flex-col gap-2">
            <button type="submit" disabled={saving || seeding} className="btn text-xs">
              {saving
                ? "Saving…"
                : selectedBin === "drafts"
                  ? "Save Demo Draft"
                  : `Save to ${bin.label}`}
            </button>
            <button
              type="button"
              onClick={handleSeedAll}
              disabled={saving || seeding}
              className="btn-outline text-xs"
            >
              {seeding ? "Seeding…" : "Seed Demo Database"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
