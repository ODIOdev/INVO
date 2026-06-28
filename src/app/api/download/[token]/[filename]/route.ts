import { pdfDownloadResponseForToken } from "@/lib/invoice-pdf-download";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string; filename: string }> }
) {
  const { token } = await context.params;
  return pdfDownloadResponseForToken(token);
}
