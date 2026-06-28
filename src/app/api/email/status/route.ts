import { NextResponse } from "next/server";
import {
  hasEmailConfig,
  hasResendConfig,
  hasSmtpConfig,
} from "@/lib/invoice-email-server";

export async function GET() {
  const smtp = hasSmtpConfig();
  const resend = hasResendConfig();

  return NextResponse.json({
    configured: hasEmailConfig(),
    provider: smtp ? "smtp" : resend ? "resend" : null,
    productionReady: smtp,
    resendTestMode: resend && !smtp,
  });
}
