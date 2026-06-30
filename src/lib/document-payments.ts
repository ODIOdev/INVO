import {
  docIdFromStoredRecord,
  resolveStateFromDocumentRecord,
} from "@/lib/client-balances";
import {
  applyPaymentToState,
  markInvoicePaid,
} from "@/lib/invoice-payments";
import { calculateDraftTotals, type DraftState } from "@/lib/drafts";
import { reconstructDraftStateFromBundle } from "@/lib/storage/dbClient";
import {
  getRecordById,
  getRecordsForDocument,
  upsertRecord,
} from "@/lib/storage/internalDatabase";
import type { StoredRecord } from "@/lib/storage/dataBins";
import type { StorageScope } from "@/lib/storage/storage-scope";

async function resolveStateForRecord(
  scope: StorageScope,
  record: StoredRecord
): Promise<DraftState | null> {
  if (record.data.state && typeof record.data.state === "object") {
    return record.data.state as DraftState;
  }

  const docId = docIdFromStoredRecord(record);
  if (
    docId &&
    (record.binId === "documents" || record.binId === "quotes")
  ) {
    const bundle = await getRecordsForDocument(scope, docId);
    const reconstructed = reconstructDraftStateFromBundle(
      docId,
      record,
      bundle
    );
    if (reconstructed) return reconstructed;
  }

  return resolveStateFromDocumentRecord(record);
}

async function persistDocumentPayment(
  scope: StorageScope,
  record: StoredRecord,
  state: DraftState
): Promise<StoredRecord> {
  const totals = calculateDraftTotals(state);

  return upsertRecord(scope, {
    id: record.id,
    binId: record.binId,
    source: record.source,
    data: {
      ...record.data,
      state,
      docType: state.docType,
      documentNumber: state.client.documentNumber,
      projectName: state.client.projectName,
      issueDate: state.client.issueDate,
      dueDate: state.client.dueDate,
      taxRate: state.taxRate,
      deposit: state.deposit ?? 0,
      amountPaid: state.amountPaid ?? 0,
      balanceDue: totals.balanceDue,
    },
  });
}

export async function recordDocumentPayment(
  scope: StorageScope,
  recordId: string,
  options: { amount?: number; markPaid?: boolean }
): Promise<
  | { record: StoredRecord; state: DraftState; balanceDue: number }
  | { error: string }
> {
  const record = await getRecordById(scope, recordId);
  if (!record) {
    return { error: "Document not found." };
  }

  if (record.binId !== "documents" && record.binId !== "drafts") {
    return { error: "Payments apply to invoices only." };
  }

  const state = await resolveStateForRecord(scope, record);
  if (!state) {
    return { error: "Could not load invoice details." };
  }

  if (state.docType !== "Invoice") {
    return { error: "Payments apply to invoices only." };
  }

  const before = calculateDraftTotals(state);
  if (before.balanceDue <= 0.01) {
    return { error: "This invoice is already paid in full." };
  }

  let nextState = state;

  if (options.markPaid) {
    nextState = markInvoicePaid(state);
  } else {
    const amount = Number(options.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Enter a payment amount greater than zero." };
    }
    nextState = applyPaymentToState(state, amount);
  }

  const after = calculateDraftTotals(nextState);
  if (after.balanceDue === before.balanceDue) {
    return { error: "No payment was applied." };
  }

  const updated = await persistDocumentPayment(scope, record, nextState);

  const docId = docIdFromStoredRecord(record);
  if (docId) {
    const draftRecord = await getRecordById(scope, `draft-${docId}`);
    if (draftRecord) {
      await upsertRecord(scope, {
        id: draftRecord.id,
        binId: draftRecord.binId,
        source: draftRecord.source,
        data: {
          ...draftRecord.data,
          state: nextState,
        },
      });
    }
  }

  return {
    record: updated,
    state: nextState,
    balanceDue: after.balanceDue,
  };
}
