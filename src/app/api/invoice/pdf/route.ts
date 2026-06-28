import { NextResponse } from "next/server";
import { generateInvoicePdfBuffer, getInvoicePdfFilename } from "@/lib/invoice-pdf";
import { getPdfDownloadState } from "@/lib/invoice-pdf-link";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";

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
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
