import Image from "next/image";
import Link from "next/link";
import { SavedDraftsButton } from "@/components/SavedDraftsModal";

const features = [
  {
    title: "Quotes & Invoices",
    description:
      "Create professional quotes and convert them to invoices in one click.",
  },
  {
    title: "Line Items & Labor",
    description:
      "Track services, hourly labor, tax rates, and totals — all calculated automatically.",
  },
  {
    title: "Export & Send",
    description:
      "Save drafts, download print-ready PDFs, and email clients directly.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#eceef1]">
      {/* Nav */}
      <header className="border-b border-black/[0.06] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Image
            src="/overdrive-logo.png"
            alt="Over Drive"
            width={800}
            height={289}
            priority
            className="h-20 w-auto md:h-24"
          />
          <div className="flex items-center gap-3">
            <Link href="/admin" className="btn-outline text-xs">
              Admin
            </Link>
            <Link href="/invoice" className="btn">
              Open App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Over Drive OS
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Invoice & Quote System
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-500 sm:text-lg">
          Build clean, professional quotes and invoices for your clients.
          Print-ready PDFs.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/invoice" className="btn px-8 py-3 text-sm">
            Create a Quote
          </Link>
          <Link href="/invoice" className="btn-outline px-8 py-3 text-sm">
            Create an Invoice
          </Link>
          <SavedDraftsButton className="btn-outline px-8 py-3 text-sm" />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-zinc-200/80 bg-white p-6 shadow-sm"
            >
              <h2 className="text-sm font-semibold text-zinc-900">
                {feature.title}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
