import { buildPdfDownloadResponse } from "@/lib/invoice-pdf-download";
import { verifySignedPdfDownloadToken } from "@/lib/invoice-pdf-signed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Direct PDF file URL — returns raw PDF bytes, not a web page. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t")?.trim() ?? "";
  if (!token) {
    return new Response("Missing download token.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const state = verifySignedPdfDownloadToken(token);
  if (!state) {
    return new Response("This download link is invalid or has expired.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    return await buildPdfDownloadResponse(state);
  } catch (error) {
    console.error("PDF file download failed:", error);
    return new Response("Unable to generate PDF.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
