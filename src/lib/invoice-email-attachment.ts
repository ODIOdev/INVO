import {
  generateInvoicePdfBuffer,
  getInvoicePdfFilename,
} from "@/lib/invoice-pdf";
import type { DraftState } from "@/lib/drafts";

export const INVOICE_PDF_CID = "invoice-pdf@overdriveio.com";

export async function buildInvoicePdfAttachment(state: DraftState): Promise<{
  filename: string;
  content: Buffer;
  cid: string;
}> {
  return {
    filename: getInvoicePdfFilename(state),
    content: await generateInvoicePdfBuffer(state),
    cid: INVOICE_PDF_CID,
  };
}
