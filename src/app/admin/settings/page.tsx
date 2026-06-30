import AdminSettingsPanel from "@/components/admin/AdminSettingsPanel";
import { getAdminAccountSettings } from "@/lib/admin-account";
import { getAdminPageProfile, getAdminPageStorageScope } from "@/lib/admin-page-scope";
import { listAdminProfileSummaries } from "@/lib/admin-profiles";
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
  const profile = await getAdminPageProfile();
  const scope = await getAdminPageStorageScope();

  const [stats, deletedRecords, bins, adminProfiles, accountSettings] =
    await Promise.all([
    getDatabaseStats(scope),
    getDeletedRecords(scope),
    getBinSummaries(scope),
    profile.role === "master" ? listAdminProfileSummaries() : Promise.resolve([]),
    getAdminAccountSettings(profile),
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
      isMasterAdmin={profile.role === "master"}
      initialAdminProfiles={adminProfiles}
      initialAccountSettings={accountSettings}
    />
  );
}
