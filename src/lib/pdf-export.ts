import type { DraftState } from "@/lib/drafts";
import { generateInvoicePdfBlob } from "@/lib/invoice-pdf";

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

export async function generatePdfBlob(
  filename: string,
  state: DraftState
): Promise<{ blob: Blob; safeFilename: string }> {
  const safeFilename = sanitizeFilename(filename);
  const blob = await generateInvoicePdfBlob(state);
  return { blob, safeFilename };
}

export async function downloadPdf(
  _elementId: string,
  filename: string,
  state: DraftState
): Promise<void> {
  const { blob, safeFilename } = await generatePdfBlob(filename, state);
  triggerFileDownload(blob, safeFilename);
}

export async function openPdfForPrint(
  _elementId: string,
  filename: string,
  state: DraftState
): Promise<"opened" | "downloaded"> {
  const { blob, safeFilename } = await generatePdfBlob(filename, state);
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");

  if (!opened) {
    URL.revokeObjectURL(url);
    triggerFileDownload(blob, safeFilename);
    return "downloaded";
  }

  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return "opened";
}
