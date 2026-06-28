import AdminSettingsPanel from "@/components/admin/AdminSettingsPanel";
import {
  hasEmailConfig,
  hasResendConfig,
  hasSmtpConfig,
} from "@/lib/invoice-email-server";
import { hasStripeConfig } from "@/lib/stripe-checkout";
import {
  getDatabaseStats,
  getStorageBackend,
} from "@/lib/storage/internalDatabase";

export const metadata = {
  title: "Admin Settings | Over Drive OS",
  description: "Admin settings and database controls",
};

export default async function AdminSettingsPage() {
  const stats = await getDatabaseStats();
  const totalRecords = stats.bins.reduce((sum, bin) => sum + bin.count, 0);

  return (
    <AdminSettingsPanel
      backend={getStorageBackend()}
      totalRecords={totalRecords}
      stripeConfigured={hasStripeConfig()}
      emailConfigured={hasEmailConfig()}
      emailProvider={
        hasResendConfig() ? "Resend" : hasSmtpConfig() ? "SMTP" : null
      }
    />
  );
}
