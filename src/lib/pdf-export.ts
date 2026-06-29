import type { DraftState } from "@/lib/drafts";
import { getInvoicePdfFilename } from "@/lib/invoice-pdf";

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^\w.-]/g, "_").replace(/\.pdf$/i, "");
  return `${base || "document"}.pdf`;
}

function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function fetchPdfBlob(state: DraftState): Promise<{ blob: Blob; safeFilename: string }> {
  const response = await fetch("/api/invoice/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to generate PDF");
  }

  const blob = await response.blob();
  const headerFilename = response.headers
    .get("Content-Disposition")
    ?.match(/filename="([^"]+)"/)?.[1];
  const safeFilename = sanitizeFilename(
    headerFilename || getInvoicePdfFilename(state)
  );

  return { blob, safeFilename };
}

export async function downloadPdf(
  _elementId: string,
  filename: string,
  state: DraftState
): Promise<void> {
  const { blob, safeFilename } = await fetchPdfBlob(state);
  triggerFileDownload(blob, filename ? sanitizeFilename(filename) : safeFilename);
}

export async function openPdfForPrint(
  _elementId: string,
  filename: string,
  state: DraftState
): Promise<"downloaded"> {
  await downloadPdf(_elementId, filename, state);
  return "downloaded";
}
