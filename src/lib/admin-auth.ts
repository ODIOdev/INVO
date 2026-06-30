import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  MASTER_ADMIN_PROFILE,
  MASTER_ADMIN_USERNAME,
  type AdminProfile,
  type AdminRole,
} from "@/lib/admin-auth-constants";

type SessionPayload = {
  u: string;
  r: AdminRole;
  d: string;
  p: string;
  e: number;
};

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SHORT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.PDF_DOWNLOAD_SECRET?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    process.env.SMTP_PASS?.trim() ||
    "overdrive-local-admin-session-dev"
  );
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signBody(body: string): Promise<string> {
  const key = await importHmacKey(getSessionSecret());
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function createAdminSessionToken(
  profile: AdminProfile,
  ttlMs: number = SESSION_TTL_MS
): Promise<string> {
  const payload: SessionPayload = {
    u: profile.username,
    r: profile.role,
    d: profile.displayName,
    p: profile.profileId,
    e: Date.now() + ttlMs,
  };
  const body = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const signature = await signBody(body);
  return `${body}.${signature}`;
}

export async function verifyAdminSessionToken(
  token: string | null | undefined
): Promise<AdminProfile | null> {
  if (!token?.trim()) return null;

  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = trimmed.slice(0, dot);
  const signature = trimmed.slice(dot + 1);
  const expected = await signBody(body);

  if (!safeEqual(signature, expected)) return null;

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(body));
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.u || !payload.r || !payload.d || !payload.p || !payload.e) return null;
    if (payload.e < Date.now()) return null;

    if (payload.r === "master") {
      if (payload.u !== MASTER_ADMIN_USERNAME) return null;
      return MASTER_ADMIN_PROFILE;
    }

    if (payload.r === "user") {
      const profileId = payload.p?.trim();
      if (!profileId) return null;

      return {
        username: payload.u,
        role: "user",
        displayName: payload.d,
        profileId,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function adminSessionCookieOptions(maxAgeSeconds = 7 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  options?: { rememberMe?: boolean }
) {
  const rememberMe = options?.rememberMe ?? true;

  if (rememberMe) {
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      token,
      adminSessionCookieOptions(REMEMBER_ME_TTL_MS / 1000)
    );
    return;
  }

  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export { REMEMBER_ME_TTL_MS, SHORT_SESSION_TTL_MS, SESSION_TTL_MS };

export { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth-constants";
