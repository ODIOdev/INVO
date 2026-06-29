import { createSignedPdfDownloadUrl } from "@/lib/invoice-pdf-signed";
import type { DraftState } from "@/lib/drafts";

export function createInvoicePdfDownloadUrl(state: DraftState): string {
  return createSignedPdfDownloadUrl(state);
}
