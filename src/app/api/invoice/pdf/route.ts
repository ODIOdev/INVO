import { NextResponse } from "next/server";
import { generateInvoicePdfBuffer, getInvoicePdfFilename } from "@/lib/invoice-pdf";
import { getPdfDownloadState } from "@/lib/invoice-pdf-link";

function attachmentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return NextResponse.json({ error: "Missing download token." }, { status: 400 });
  }

  const state = await getPdfDownloadState(token);
  if (!state) {
    return NextResponse.json(
      { error: "This download link is invalid or has expired." },
      { status: 404 }
    );
  }

  try {
    const pdf = await generateInvoicePdfBuffer(state);
    const filename = getInvoicePdfFilename(state);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": attachmentDisposition(filename),
        "Content-Transfer-Encoding": "binary",
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
