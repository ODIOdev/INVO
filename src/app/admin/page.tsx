import AdminDataBinsPanel from "@/components/admin/AdminDataBinsPanel";
import {
  isDataBinView,
  parseAdminView,
} from "@/components/admin/admin-nav";
import { getAdminDashboardStats } from "@/lib/admin-dashboard";
import {
  hasEmailConfig,
  hasResendConfig,
  hasSmtpConfig,
} from "@/lib/invoice-email-server";
import { hasStripeConfig } from "@/lib/stripe-checkout";
import { hasTwilioConfig } from "@/lib/invoice-sms-server";
import {
  getBinSummaries,
  getRecordsByBin,
  getStorageBackend,
} from "@/lib/storage/internalDatabase";

export const metadata = {
  title: "Dashboard | Over Drive OS",
  description: "Dashboard for quotes, invoices, and clients",
};

type AdminPageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { view } = await searchParams;
  const initialView = parseAdminView(view);
  const initialBin = isDataBinView(initialView) ? initialView : "clients";

  const [bins, initialRecords, dashboardStats] = await Promise.all([
    getBinSummaries(),
    getRecordsByBin(initialBin),
    getAdminDashboardStats(),
  ]);

  return (
    <AdminDataBinsPanel
      initialBins={bins}
      initialRecords={initialRecords}
      initialView={initialView}
      dashboardStats={dashboardStats}
      integrations={{
        backend: getStorageBackend(),
        stripeConfigured: hasStripeConfig(),
        emailConfigured: hasEmailConfig(),
        emailProvider: hasResendConfig()
          ? "Resend"
          : hasSmtpConfig()
            ? "SMTP"
            : null,
        smsConfigured: hasTwilioConfig(),
      }}
    />
  );
}
