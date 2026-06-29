import { generateInvoicePdfBuffer, getInvoicePdfFilename } from "@/lib/invoice-pdf";
import { verifySignedPdfDownloadToken } from "@/lib/invoice-pdf-signed";
import type { DraftState } from "@/lib/drafts";

function inlinePdfDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
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
      "Content-Disposition": inlinePdfDisposition(filename),
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
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

  const state = verifySignedPdfDownloadToken(trimmed);
  if (!state) {
    return new Response("This download link is invalid or has expired.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    return await buildPdfDownloadResponse(state);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate PDF.";
    return Response.json({ error: message }, { status: 500 });
  }
}
