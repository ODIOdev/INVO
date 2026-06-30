"use client";

import { useState } from "react";
import { formatMoney, formatMoneyInput, parseCurrencyInput } from "@/lib/drafts";
import { submitDocumentPayment } from "@/lib/document-payment-api";

function PaymentCurrencyInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState("");

  return (
    <div className="currency-wrap">
      <span className="currency-symbol">$</span>
      <input
        className="currency-field"
        inputMode="decimal"
        placeholder="0.00"
        disabled={disabled}
        aria-label="Payment amount"
        value={focused ? display : value > 0 ? formatMoneyInput(value) : ""}
        onFocus={() => {
          setFocused(true);
          setDisplay(value > 0 ? String(value) : "");
        }}
        onBlur={() => {
          setFocused(false);
          onChange(parseCurrencyInput(display));
        }}
        onChange={(event) => {
          setDisplay(event.target.value);
          onChange(parseCurrencyInput(event.target.value));
        }}
      />
    </div>
  );
}

type AdminPaymentControlsProps = {
  recordId: string;
  invoiceLabel: string;
  balanceDue: number;
  onApplied?: () => void | Promise<void>;
  disabled?: boolean;
  compact?: boolean;
};

export default function AdminPaymentControls({
  recordId,
  invoiceLabel,
  balanceDue,
  onApplied,
  disabled = false,
  compact = false,
}: AdminPaymentControlsProps) {
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRecordPayment = async () => {
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }

    setPaying(true);
    setError(null);
    setMessage(null);

    try {
      const result = await submitDocumentPayment(recordId, {
        amount: paymentAmount,
      });
      setPaymentAmount(0);
      setMessage(
        `Payment of ${formatMoney(paymentAmount)} recorded. Balance due: ${formatMoney(result.balanceDue)}.`
      );
      await onApplied?.();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to record payment."
      );
    } finally {
      setPaying(false);
    }
  };

  const handleMarkPaid = async () => {
    if (balanceDue <= 0.01) return;

    if (
      !window.confirm(
        `Mark ${invoiceLabel !== "—" ? invoiceLabel : "this invoice"} as paid in full (${formatMoney(balanceDue)})?`
      )
    ) {
      return;
    }

    setPaying(true);
    setError(null);
    setMessage(null);

    try {
      await submitDocumentPayment(recordId, { markPaid: true });
      setPaymentAmount(0);
      setMessage("Invoice marked as paid in full.");
      await onApplied?.();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to mark as paid."
      );
    } finally {
      setPaying(false);
    }
  };

  const busy = paying || disabled;

  if (balanceDue <= 0.01) {
    return (
      <p className="text-sm text-emerald-700">This invoice is paid in full.</p>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-3"}>
      {error ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <PaymentCurrencyInput
            value={paymentAmount}
            onChange={setPaymentAmount}
            disabled={busy}
          />
        </div>
        <button
          type="button"
          className="btn shrink-0 text-sm disabled:opacity-40"
          onClick={() => void handleRecordPayment()}
          disabled={busy || paymentAmount <= 0}
        >
          {paying ? "Saving…" : "Apply"}
        </button>
      </div>
      <button
        type="button"
        className="btn-outline w-full text-sm disabled:opacity-40"
        onClick={() => void handleMarkPaid()}
        disabled={busy}
      >
        Mark as paid
      </button>
    </div>
  );
}
