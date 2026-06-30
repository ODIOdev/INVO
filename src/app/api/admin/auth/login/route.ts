import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  REMEMBER_ME_TTL_MS,
  setSessionCookie,
  SHORT_SESSION_TTL_MS,
} from "@/lib/admin-auth";
import { profileFromCredentials } from "@/lib/admin-auth-server";

export async function POST(request: Request) {
  let body: { username?: string; password?: string; rememberMe?: boolean };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = String(body.username ?? "");
  const password = String(body.password ?? "");
  const rememberMe = body.rememberMe === true;

  const profile = await profileFromCredentials(username, password);
  if (!profile) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const token = await createAdminSessionToken(
    profile,
    rememberMe ? REMEMBER_ME_TTL_MS : SHORT_SESSION_TTL_MS
  );
  const response = NextResponse.json({ ok: true, profile });
  setSessionCookie(response, token, { rememberMe });
  return response;
}
