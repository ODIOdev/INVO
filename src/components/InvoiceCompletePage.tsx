"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import InvoiceDocumentPreview from "@/components/InvoiceDocumentPreview";
import { calculateDraftTotals, formatMoney, getDraft } from "@/lib/drafts";
import { downloadPdf as exportPdf } from "@/lib/pdf-export";

type Toast = { message: string; type: "success" | "error" } | null;

export default function InvoiceCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");
  const syncFailed = searchParams.get("sync") === "failed";

  const draft = draftId ? getDraft(draftId) : null;
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const autoExportStarted = useRef(false);

  useEffect(() => {
    if (!draft) {
      router.replace("/invoice");
    }
  }, [draft, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!draft || autoExportStarted.current) return;
    autoExportStarted.current = true;

    const timer = setTimeout(async () => {
      try {
        const filename =
          draft.state.client.documentNumber || draft.state.docType;
        await exportPdf("invoice-preview", filename);
        setToast({ message: "PDF downloaded to your device", type: "success" });
      } catch (error) {
        console.error("PDF export failed:", error);
        setToast({ message: "Failed to generate PDF", type: "error" });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [draft]);

  if (!draft) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eceef1]">
        <p className="text-sm text-zinc-500">Loading invoice…</p>
      </main>
    );
  }

  const { state } = draft;
  const { client, docType } = state;
  const { balanceDue } = calculateDraftTotals(state);
  const savedToAdmin = !syncFailed;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const filename = client.documentNumber || docType;
      await exportPdf("invoice-preview", filename);
      setToast({ message: "PDF downloaded to your device", type: "success" });
    } catch (error) {
      console.error("PDF export failed:", error);
      setToast({ message: "Failed to generate PDF", type: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-screen">
      <nav className="app-nav no-print">
        <div className="app-nav-inner">
          <Link
            href="/index"
            className="rounded-md transition opacity-90 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            aria-label="Back to home"
          >
            <Image
              src="/overdrive-logo.png"
              alt="Over Drive"
              width={800}
              height={289}
              priority
              className="h-16 w-auto md:h-20"
            />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="btn-outline text-xs">
              Admin
            </Link>
            <Link href={`/invoice?draft=${draft.id}`} className="btn-outline text-xs">
              Edit Invoice
            </Link>
          </div>
        </div>
      </nav>

      <div className="app-body">
        <div className="no-print mb-8 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
            Invoice Complete
          </p>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900">
            {client.documentNumber} — {client.projectName || "Untitled Project"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Your quote has been converted to an invoice
            {savedToAdmin
              ? " and saved to the admin database."
              : ". Local copy saved; admin sync failed."}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-800">
            Total due: {formatMoney(balanceDue)}
          </p>
        </div>

        <InvoiceDocumentPreview state={state} />

        <div className="action-bar no-print">
          <Link href="/index" className="btn-outline">
            Back to Home
          </Link>
          <button type="button" onClick={handlePrint} className="btn-outline">
            Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="btn-outline"
          >
            {isExporting ? "Generating…" : "Download PDF"}
          </button>
          <Link href="/admin" className="btn">
            View in Admin
          </Link>
        </div>
      </div>

      {toast && (
        <div
          className={`no-print fixed bottom-6 right-6 z-50 rounded-md px-4 py-2.5 text-[13px] font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-zinc-900 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}
