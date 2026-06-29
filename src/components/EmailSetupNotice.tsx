import Link from "next/link";

export default function EmailSetupNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">Send from admin@overdriveio.com</p>
      <p className="mt-1 text-amber-900/90">
        Resend test mode only allows your personal Gmail. Add your Hostinger
        email password so invoices send from{" "}
        <span className="font-mono">admin@overdriveio.com</span> to any client.
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs text-amber-900/90">
        <li>
          In{" "}
          <a
            href="https://hpanel.hostinger.com/emails"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Hostinger → Emails
          </a>
          , confirm <span className="font-mono">admin@overdriveio.com</span>{" "}
          exists and note its password
        </li>
        <li>
          In Vercel → Project → Environment Variables, add{" "}
          <span className="rounded bg-amber-100 px-1 font-mono">SMTP_PASS</span>{" "}
          with that email password
        </li>
        <li>Redeploy, then click Email again</li>
      </ol>
      <p className="mt-3 text-xs text-amber-800/90">
        Or verify{" "}
        <span className="font-mono">overdriveio.com</span> at{" "}
        <a
          href="https://resend.com/domains"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
        >
          resend.com/domains
        </a>{" "}
        and set{" "}
        <span className="font-mono">EMAIL_FROM</span> to{" "}
        <span className="font-mono">Over Drive OS &lt;admin@overdriveio.com&gt;</span>
        . See{" "}
        <Link href="/admin/settings" className="font-semibold underline">
          Dashboard → Settings
        </Link>
        .
      </p>
    </div>
  );
}
