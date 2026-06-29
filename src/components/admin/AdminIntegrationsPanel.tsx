import Link from "next/link";
import AdminIcon from "@/components/admin/AdminIcons";
import type { AdminIconName } from "@/lib/admin-icons";

export type AdminIntegrationsInfo = {
  backend: "redis" | "local";
  stripeConfigured: boolean;
  emailConfigured: boolean;
  emailProvider: string | null;
  smsConfigured: boolean;
};

type AdminIntegrationsPanelProps = {
  integrations: AdminIntegrationsInfo;
};

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        connected
          ? "bg-emerald-50 text-emerald-700"
          : "bg-zinc-100 text-zinc-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? "bg-emerald-500" : "bg-zinc-400"
        }`}
      />
      {connected ? "Connected" : "Not configured"}
    </span>
  );
}

function IntegrationCard({
  title,
  description,
  connected,
  icon,
  children,
}: {
  title: string;
  description: string;
  connected: boolean;
  icon: AdminIconName;
  children?: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="admin-dash-action-icon mt-0.5">
            <AdminIcon name={icon} size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
        </div>
        <StatusPill connected={connected} />
      </div>
      {children && <div className="mt-4 pl-11">{children}</div>}
    </article>
  );
}

export default function AdminIntegrationsPanel({
  integrations,
}: AdminIntegrationsPanelProps) {
  const { backend, stripeConfigured, emailConfigured, emailProvider, smsConfigured } =
    integrations;

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <IntegrationCard
          title="Cloud storage"
          description="Where quotes, invoices, and catalog data are stored."
          connected={backend === "redis"}
          icon="cloud"
        >
          <p className="text-sm font-medium text-zinc-800">
            {backend === "redis" ? "Vercel Cloud (Redis)" : "Local file storage"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {backend === "redis"
              ? "Data syncs across devices via Upstash Redis on Vercel."
              : "Development mode — data is stored on this machine only."}
          </p>
        </IntegrationCard>

        <IntegrationCard
          title="Email delivery"
          description="Sends invoice and quote PDFs from admin@overdriveio.com."
          connected={emailConfigured}
          icon="mail"
        >
          {emailConfigured ? (
            <p className="text-sm text-zinc-700">
              Active provider:{" "}
              <span className="font-semibold text-zinc-900">
                {emailProvider}
              </span>
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              Add Hostinger SMTP or Resend credentials in environment variables.
            </p>
          )}
        </IntegrationCard>

        <IntegrationCard
          title="SMS delivery"
          description="Texts quote and invoice summaries to client phone numbers."
          connected={smsConfigured}
          icon="mail"
        >
          {smsConfigured ? (
            <p className="text-sm text-zinc-700">
              Active provider:{" "}
              <span className="font-semibold text-zinc-900">Twilio</span>
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              Add Twilio credentials in environment variables.
            </p>
          )}
        </IntegrationCard>

        <IntegrationCard
          title="Stripe payments"
          description="Pay links included in invoice emails when enabled."
          connected={stripeConfigured}
          icon="credit-card"
        >
          {!stripeConfigured && (
            <p className="text-xs text-zinc-500">
              Set <span className="font-mono">STRIPE_SECRET_KEY</span> in Vercel
              to enable checkout links.
            </p>
          )}
        </IntegrationCard>
      </div>

      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-4">
        <p className="text-sm text-zinc-600">
          Full setup instructions and database controls live in{" "}
          <Link href="/admin/settings" className="font-semibold text-blue-600 hover:underline">
            Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
