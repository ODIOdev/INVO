import Link from "next/link";

export default function EmailSetupNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">Email sending is not configured yet</p>
      <p className="mt-1 text-amber-900/90">
        To email clients the full HTML invoice with the Stripe pay button, connect
        Resend (free tier available).
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs text-amber-900/90">
        <li>
          Create an account at{" "}
          <a
            href="https://resend.com/signup"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            resend.com
          </a>
        </li>
        <li>
          Create an API key at{" "}
          <a
            href="https://resend.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            resend.com/api-keys
          </a>
        </li>
        <li>
          Add{" "}
          <span className="rounded bg-amber-100 px-1 font-mono">RESEND_API_KEY</span>{" "}
          to{" "}
          <a
            href="https://vercel.com/integrations/resend"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Vercel → Resend integration
          </a>{" "}
          (easiest) or{" "}
          <Link href="/admin/settings" className="font-semibold underline">
            Admin → Settings
          </Link>
        </li>
        <li>
          Set{" "}
          <span className="rounded bg-amber-100 px-1 font-mono">EMAIL_FROM</span>{" "}
          e.g.{" "}
          <span className="font-mono">
            Over Drive OS &lt;invoices@yourdomain.com&gt;
          </span>
        </li>
      </ol>
    </div>
  );
}
