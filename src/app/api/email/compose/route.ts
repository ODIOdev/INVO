import type { DraftState } from "@/lib/drafts";
import {
  buildInvoiceEmailSubject,
  buildInvoiceEmlForCompose,
} from "@/lib/invoice-email-server";

function emlFilename(subject: string): string {
  const safe = subject
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${safe || "invoice"}.eml`;
}

async function parseBody(request: Request): Promise<{
  state?: DraftState;
  to?: string;
  paymentUrl?: string | null;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const form = await request.formData();
  const stateRaw = form.get("state");
  const to = form.get("to");
  const paymentUrl = form.get("paymentUrl");

  return {
    state:
      typeof stateRaw === "string"
        ? (JSON.parse(stateRaw) as DraftState)
        : undefined,
    to: typeof to === "string" ? to : undefined,
    paymentUrl:
      typeof paymentUrl === "string" && paymentUrl.trim()
        ? paymentUrl.trim()
        : null,
  };
}

export async function POST(request: Request) {
  let body: { state?: DraftState; to?: string; paymentUrl?: string | null };

  try {
    body = await parseBody(request);
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const state = body.state;
  const to = typeof body.to === "string" ? body.to.trim() : "";

  if (!state?.client || !to) {
    return new Response("A valid invoice and recipient email are required.", {
      status: 400,
    });
  }

  try {
    const subject = buildInvoiceEmailSubject(state);
    const eml = await buildInvoiceEmlForCompose(
      state,
      to,
      body.paymentUrl ?? undefined
    );
    const filename = emlFilename(subject);

    return new Response(eml, {
      headers: {
        "Content-Type": "message/rfc822; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to prepare email";
    return new Response(message, { status: 500 });
  }
}
