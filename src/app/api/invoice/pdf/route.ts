import type { DraftState } from "@/lib/drafts";
import { buildPdfDownloadResponse, pdfDownloadResponseForToken } from "@/lib/invoice-pdf-download";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isDraftState(value: unknown): value is DraftState {
  if (!value || typeof value !== "object") return false;
  const state = value as DraftState;
  return Boolean(state.client && state.docType && Array.isArray(state.services));
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  return pdfDownloadResponseForToken(token);
}

export async function POST(request: Request) {
  let body: { state?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isDraftState(body.state)) {
    return Response.json({ error: "A valid document state is required." }, { status: 400 });
  }

  try {
    return await buildPdfDownloadResponse(body.state);
  } catch (error) {
    console.error("PDF generation failed:", error);
    return Response.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}
