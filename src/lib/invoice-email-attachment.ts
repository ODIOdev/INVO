import {
  generateInvoicePdfBuffer,
  getInvoicePdfFilename,
} from "@/lib/invoice-pdf";
import type { DraftState } from "@/lib/drafts";

export async function buildInvoicePdfAttachment(state: DraftState): Promise<{
  filename: string;
  content: Buffer;
}> {
  return {
    filename: getInvoicePdfFilename(state),
    content: await generateInvoicePdfBuffer(state),
  };
}
