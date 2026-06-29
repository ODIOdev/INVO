import { pdfDownloadResponseForToken } from "@/lib/invoice-pdf-download";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Legacy email links — return PDF directly, no redirect page. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string; filename: string }> }
) {
  const { token } = await context.params;
  return pdfDownloadResponseForToken(token);
}
