import { createHmac, timingSafeEqual } from "crypto";
import type { DraftState } from "@/lib/drafts";
import { getInvoicePdfFilename } from "@/lib/invoice-pdf";

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type SignedPayload = {
  s: DraftState;
  e: number;
};

function getPublicAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "http://localhost:3000";
}

function getSigningSecret(): string {
  const secret =
    process.env.PDF_DOWNLOAD_SECRET?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    process.env.SMTP_PASS?.trim();

  if (!secret) {
    throw new Error(
      "PDF download signing secret is not configured (PDF_DOWNLOAD_SECRET, STRIPE_SECRET_KEY, or SMTP_PASS)."
    );
  }

  return secret;
}

function signBody(body: string): string {
  return createHmac("sha256", getSigningSecret()).update(body).digest("base64url");
}

export function createSignedPdfDownloadUrl(state: DraftState): string {
  const payload: SignedPayload = {
    s: state,
    e: Date.now() + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${body}.${signBody(body)}`;
  const filename = encodeURIComponent(getInvoicePdfFilename(state));
  return `${getPublicAppUrl()}/pdf/${filename}?t=${encodeURIComponent(token)}`;
}

export function verifySignedPdfDownloadToken(token: string): DraftState | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  const expected = signBody(body);

  try {
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SignedPayload;
    if (!payload.s || !payload.e || payload.e < Date.now()) return null;
    return payload.s;
  } catch {
    return null;
  }
}
