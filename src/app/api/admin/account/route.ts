import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  setSessionCookie,
} from "@/lib/admin-auth";
import {
  getAdminAccountSettings,
  updateAdminAccountSettings,
} from "@/lib/admin-account";
import { getAdminSessionProfile } from "@/lib/admin-auth-server";

export async function GET() {
  const profile = await getAdminSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await getAdminAccountSettings(profile);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const profile = await getAdminSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    displayName?: string;
    email?: string;
    website?: string;
    logo?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await updateAdminAccountSettings(profile, body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const nextProfile = {
    ...profile,
    displayName: result.displayName,
  };
  const token = await createAdminSessionToken(nextProfile);
  const response = NextResponse.json({ settings: result.settings });
  setSessionCookie(response, token, { rememberMe: true });
  return response;
}
