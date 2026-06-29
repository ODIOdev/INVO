import AdminSettingsPanel from "@/components/admin/AdminSettingsPanel";
import {
  hasEmailConfig,
  hasResendConfig,
  hasSmtpConfig,
} from "@/lib/invoice-email-server";
import { hasStripeConfig } from "@/lib/stripe-checkout";
import { hasTwilioConfig } from "@/lib/invoice-sms-server";
import {
  getBinSummaries,
  getDatabaseStats,
  getDeletedRecords,
  getStorageBackend,
} from "@/lib/storage/internalDatabase";

export const metadata = {
  title: "Dashboard Settings | Over Drive OS",
  description: "Dashboard settings and database controls",
};

export default async function AdminSettingsPage() {
  const [stats, deletedRecords, bins] = await Promise.all([
    getDatabaseStats(),
    getDeletedRecords(),
    getBinSummaries(),
  ]);
  const totalRecords = stats.bins.reduce((sum, bin) => sum + bin.count, 0);

  return (
    <AdminSettingsPanel
      bins={bins}
      backend={getStorageBackend()}
      totalRecords={totalRecords}
      initialDeletedRecords={deletedRecords}
      stripeConfigured={hasStripeConfig()}
      emailConfigured={hasEmailConfig()}
      emailProvider={
        hasResendConfig() ? "Resend" : hasSmtpConfig() ? "SMTP" : null
      }
      smsConfigured={hasTwilioConfig()}
      twilioFromNumber={process.env.TWILIO_PHONE_NUMBER?.trim() || null}
    />
  );
}
