import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  setSessionCookie,
} from "@/lib/admin-auth";
import { createAdminProfile } from "@/lib/admin-profiles";

export async function POST(request: Request) {
  let body: {
    username?: string;
    displayName?: string;
    password?: string;
    confirmPassword?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = String(body.username ?? "");
  const displayName = String(body.displayName ?? body.username ?? "");
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const result = await createAdminProfile({ username, displayName, password });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const profile = {
    username: result.profile.username,
    role: result.profile.role,
    displayName: result.profile.displayName,
    profileId: result.profile.id,
  };

  const token = await createAdminSessionToken(profile);
  const response = NextResponse.json({ ok: true, profile });
  setSessionCookie(response, token);

  return response;
}
