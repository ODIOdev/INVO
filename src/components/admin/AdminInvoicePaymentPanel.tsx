"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPaymentControls from "@/components/admin/AdminPaymentControls";
import {
  resolveClientDocumentRecord,
  type ClientDocumentRow,
} from "@/lib/client-balances";
import { formatMoney } from "@/lib/drafts";
import type { StoredRecord } from "@/lib/storage/dataBins";
import { fetchRecordById } from "@/lib/storage/dbClient";

type AdminInvoicePaymentPanelProps = {
  documents: ClientDocumentRow[];
  documentRecords: StoredRecord[];
  onPaymentApplied?: () => void | Promise<void>;
};

async function resolveRecordForDocument(
  doc: ClientDocumentRow,
  documentRecords: StoredRecord[]
): Promise<StoredRecord | null> {
  let record = resolveClientDocumentRecord(doc, documentRecords);
  if (record) return record;

  const fetchIds = [
    doc.id,
    `doc-${doc.docId}`,
    `quote-${doc.docId}`,
    `draft-${doc.docId}`,
  ].filter((id, index, arr) => Boolean(id) && arr.indexOf(id) === index);

  for (const id of fetchIds) {
    try {
      const { record: fetched } = await fetchRecordById(id);
      if (fetched) return fetched;
    } catch {
      // try next id
    }
  }

  return null;
}

export default function AdminInvoicePaymentPanel({
  documents,
  documentRecords,
  onPaymentApplied,
}: AdminInvoicePaymentPanelProps) {
  const payableInvoices = useMemo(
    () =>
      documents.filter(
        (doc) =>
          doc.docType === "Invoice" &&
          doc.status !== "Draft" &&
          doc.balanceDue > 0.01
      ),
    [documents]
  );

  const [selectedDocId, setSelectedDocId] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const selectedDoc = useMemo(
    () => payableInvoices.find((doc) => doc.id === selectedDocId) ?? null,
    [payableInvoices, selectedDocId]
  );

  useEffect(() => {
    if (payableInvoices.length === 0) {
      setSelectedDocId("");
      return;
    }

    if (!payableInvoices.some((doc) => doc.id === selectedDocId)) {
      setSelectedDocId(payableInvoices[0].id);
    }
  }, [payableInvoices, selectedDocId]);

  const loadRecord = useCallback(async () => {
    if (!selectedDoc) {
      setRecordId(null);
      return;
    }

    setResolving(true);
    setResolveError(null);

    try {
      const record = await resolveRecordForDocument(
        selectedDoc,
        documentRecords
      );
      if (!record) {
        setRecordId(null);
        setResolveError("Could not load the selected invoice.");
        return;
      }
      setRecordId(record.id);
    } finally {
      setResolving(false);
    }
  }, [documentRecords, selectedDoc]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  if (payableInvoices.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3 text-sm text-zinc-500">
        No open invoices with a balance due for this client.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
        Record payment
      </p>
      <p className="mt-1 text-xs text-emerald-700/80">
        Select an invoice, then apply a payment or mark it paid in full.
      </p>

      <div className="mt-3">
        <label className="doc-label" htmlFor="client-payment-invoice">
          Apply payment to
        </label>
        <select
          id="client-payment-invoice"
          className="field"
          value={selectedDocId}
          onChange={(event) => setSelectedDocId(event.target.value)}
          disabled={resolving}
        >
          {payableInvoices.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.documentNumber} — {doc.projectName} (
              {formatMoney(doc.balanceDue)} due)
            </option>
          ))}
        </select>
      </div>

      {selectedDoc ? (
        <p className="mt-2 text-xs text-zinc-600">
          Balance due on{" "}
          <span className="font-semibold tabular-nums text-zinc-800">
            {formatMoney(selectedDoc.balanceDue)}
          </span>
        </p>
      ) : null}

      {resolveError ? (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {resolveError}
        </p>
      ) : null}

      {recordId && selectedDoc ? (
        <div className="mt-3 border-t border-emerald-200/60 pt-3">
          <AdminPaymentControls
            key={`${recordId}-${selectedDoc.balanceDue}`}
            recordId={recordId}
            invoiceLabel={selectedDoc.documentNumber}
            balanceDue={selectedDoc.balanceDue}
            onApplied={async () => {
              await onPaymentApplied?.();
              await loadRecord();
            }}
            disabled={resolving}
          />
        </div>
      ) : resolving ? (
        <p className="mt-3 text-sm text-zinc-500">Loading invoice…</p>
      ) : null}
    </div>
  );
}
