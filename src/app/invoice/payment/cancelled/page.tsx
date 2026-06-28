import Link from "next/link";

export default function PaymentCancelledPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#eceef1] px-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Payment cancelled</h1>
        <p className="mt-2 text-sm text-zinc-500">
          No charge was made. You can return to the invoice email to pay when ready.
        </p>
        <Link href="/" className="btn-outline mt-6 inline-flex">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
