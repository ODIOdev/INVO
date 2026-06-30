import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";
import { recordDocumentPayment } from "@/lib/document-payments";
import { requireStorageScope } from "@/lib/storage/storage-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const cookieStore = await cookies();
  const profile = await verifyAdminSessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Record id required." }, { status: 400 });
  }

  let body: { amount?: number; markPaid?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await recordDocumentPayment(scopeResult, id, {
    amount: body.amount,
    markPaid: Boolean(body.markPaid),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    balanceDue: result.balanceDue,
    amountPaid: result.state.amountPaid ?? 0,
  });
}
