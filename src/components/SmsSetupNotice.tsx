import Link from "next/link";

export default function SmsSetupNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">Finish Twilio SMS setup</p>
      <p className="mt-1 text-amber-900/90">
        Your Twilio Account SID is saved. Add the remaining credentials so SMS
        sends automatically from the invoice page.
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs text-amber-900/90">
        <li>
          In{" "}
          <a
            href="https://console.twilio.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            Twilio Console
          </a>
          , copy your Auth Token from the dashboard home
        </li>
        <li>
          Buy or use a Twilio phone number under Phone Numbers → Manage → Active
          numbers
        </li>
        <li>
          In Vercel → Project → Environment Variables, add{" "}
          <span className="rounded bg-amber-100 px-1 font-mono">
            TWILIO_AUTH_TOKEN
          </span>{" "}
          and{" "}
          <span className="rounded bg-amber-100 px-1 font-mono">
            TWILIO_PHONE_NUMBER
          </span>{" "}
          (E.164 format, e.g. +15551234567)
        </li>
        <li>Redeploy, then click SMS again</li>
      </ol>
      <p className="mt-3 text-xs text-amber-800/90">
        See{" "}
        <Link href="/admin/settings" className="font-semibold underline">
          Dashboard → Settings
        </Link>{" "}
        for connection status.
      </p>
    </div>
  );
}
