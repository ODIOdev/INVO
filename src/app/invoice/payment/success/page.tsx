import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#eceef1] px-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          ✓
        </div>
        <h1 className="text-xl font-semibold text-zinc-900">Payment received</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Thank you — your payment was processed securely through Stripe.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
