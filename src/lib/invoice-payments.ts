import {
  calculateDraftTotals,
  type DraftState,
} from "@/lib/drafts";

export function normalizeAmountPaid(state: DraftState): number {
  return Math.max(0, Number(state.amountPaid) || 0);
}

export function applyPaymentToState(
  state: DraftState,
  amount: number
): DraftState {
  const totals = calculateDraftTotals(state);
  if (totals.balanceDue <= 0.01 || amount <= 0) return state;

  const payment = Math.min(amount, totals.balanceDue);
  return {
    ...state,
    amountPaid: normalizeAmountPaid(state) + payment,
  };
}

export function markInvoicePaid(state: DraftState): DraftState {
  const totals = calculateDraftTotals(state);
  if (totals.balanceDue <= 0.01) return state;

  return {
    ...state,
    amountPaid: normalizeAmountPaid(state) + totals.balanceDue,
  };
}
