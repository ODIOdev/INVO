import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin-auth-server";
import { listAdminProfileSummaries } from "@/lib/admin-profiles";

export async function GET() {
  const auth = await requireMasterAdmin();
  if (auth instanceof NextResponse) return auth;

  const profiles = await listAdminProfileSummaries();
  return NextResponse.json({ profiles });
}
