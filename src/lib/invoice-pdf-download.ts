import { generateInvoicePdfBuffer, getInvoicePdfFilename } from "@/lib/invoice-pdf";
import { getPdfDownloadState } from "@/lib/invoice-pdf-link";
import type { DraftState } from "@/lib/drafts";

function attachmentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function buildPdfDownloadResponse(
  state: DraftState
): Promise<Response> {
  const pdf = await generateInvoicePdfBuffer(state);
  const filename = getInvoicePdfFilename(state);

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": attachmentDisposition(filename),
      "Content-Transfer-Encoding": "binary",
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Download-Options": "noopen",
      "Content-Description": "File Transfer",
    },
  });
}

export async function pdfDownloadResponseForToken(
  token: string
): Promise<Response> {
  const trimmed = token.trim();
  if (!trimmed) {
    return Response.json({ error: "Missing download token." }, { status: 400 });
  }

  const state = await getPdfDownloadState(trimmed);
  if (!state) {
    return Response.json(
      { error: "This download link is invalid or has expired." },
      { status: 404 }
    );
  }

  try {
    return await buildPdfDownloadResponse(state);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate PDF.";
    return Response.json({ error: message }, { status: 500 });
  }
}
