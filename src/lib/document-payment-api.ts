export async function submitDocumentPayment(
  recordId: string,
  options: { amount?: number; markPaid?: boolean }
): Promise<{ balanceDue: number; amountPaid: number }> {
  const response = await fetch(`/api/storage/records/${recordId}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  const data = (await response.json()) as {
    error?: string;
    balanceDue?: number;
    amountPaid?: number;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to record payment.");
  }

  return {
    balanceDue: data.balanceDue ?? 0,
    amountPaid: data.amountPaid ?? 0,
  };
}
