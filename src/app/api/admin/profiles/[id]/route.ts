import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin-auth-server";
import { deleteAdminProfile, getAdminProfilePassword } from "@/lib/admin-profiles";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireMasterAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Profile id required." }, { status: 400 });
  }

  const password = await getAdminProfilePassword(id);
  return NextResponse.json({ password });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireMasterAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Profile id required." }, { status: 400 });
  }

  const result = await deleteAdminProfile(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    deletedRecords: result.deletedRecords,
  });
}
