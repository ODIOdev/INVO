import { readFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { DraftState } from "@/lib/drafts";
import {
  generateInvoiceEmailHtml,
  generateInvoicePlainText,
} from "@/lib/invoice-email-html";
import { createInvoicePaymentUrl } from "@/lib/stripe-checkout";

function getPublicAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "http://localhost:3000";
}

export async function loadServerLogoDataUrl(): Promise<string | undefined> {
  try {
    const buffer = await readFile(
      path.join(process.cwd(), "public", "overdrive-logo.png")
    );
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export function getHostedLogoUrl(): string {
  return `${getPublicAppUrl()}/overdrive-logo.png`;
}

export function buildInvoiceEmailSubject(state: DraftState): string {
  return `${state.docType} ${state.client.documentNumber} — ${(state.client.projectName ?? "").trim() || "Over Drive OS"}`;
}

export async function buildInvoiceEmailBodies(
  state: DraftState,
  to: string,
  logoUrl?: string,
  existingPaymentUrl?: string | null
): Promise<{
  html: string;
  plainText: string;
  paymentUrl: string | null;
  subject: string;
}> {
  const subject = buildInvoiceEmailSubject(state);
  const paymentUrl =
    existingPaymentUrl !== undefined
      ? existingPaymentUrl
      : await createInvoicePaymentUrl(state, to).catch(() => null);
  const logo = logoUrl ?? getHostedLogoUrl();
  const html = generateInvoiceEmailHtml(state, { logoUrl: logo, paymentUrl });
  const plainText = generateInvoicePlainText(state, { paymentUrl });

  return { html, plainText, paymentUrl, subject };
}

function foldBase64(input: string): string {
  return input.replace(/.{1,76}/g, "$&\r\n").trim();
}

function encodeBase64Utf8(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64");
}

export function buildInvoiceEml(options: {
  to?: string;
  subject: string;
  html: string;
  plainText: string;
}): string {
  const boundary = `----=_Invoice_${Date.now()}`;
  const toLine = options.to?.trim() ? `To: ${options.to.trim()}\r\n` : "";
  const htmlBase64 = foldBase64(encodeBase64Utf8(options.html));

  return [
    toLine + `Subject: ${options.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    options.plainText,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    htmlBase64,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export function hasSmtpConfig(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

export function hasResendConfig(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "Over Drive OS <onboarding@resend.dev>"
  );
}

export async function sendInvoiceViaResend(
  state: DraftState,
  to: string
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const logo = await loadServerLogoDataUrl();
  const { html, plainText, subject } = await buildInvoiceEmailBodies(
    state,
    to,
    logo ?? getHostedLogoUrl()
  );

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: [to],
    subject,
    html,
    text: plainText,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email");
  }
}

export async function sendInvoiceViaSmtp(
  state: DraftState,
  to: string
): Promise<void> {
  const logo = await loadServerLogoDataUrl();
  const { html, plainText, subject } = await buildInvoiceEmailBodies(
    state,
    to,
    logo ?? getHostedLogoUrl()
  );

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text: plainText,
  });
}

export async function buildInvoiceEmlForCompose(
  state: DraftState,
  to: string,
  existingPaymentUrl?: string | null
): Promise<string> {
  const { html, plainText, subject } = await buildInvoiceEmailBodies(
    state,
    to,
    undefined,
    existingPaymentUrl
  );

  return buildInvoiceEml({ to, subject, html, plainText });
}
