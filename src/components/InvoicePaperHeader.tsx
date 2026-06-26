import type { DocType } from "@/lib/drafts";

type InvoicePaperHeaderProps = {
  docType: DocType;
  projectName: string;
};

export default function InvoicePaperHeader({
  docType,
  projectName,
}: InvoicePaperHeaderProps) {
  return (
    <div className="doc-masthead">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/overdrive-logo.png"
        alt="Over Drive OS"
        className="doc-logo"
      />
      <div className="doc-masthead-meta">
        <p className="doc-heading">{docType}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {projectName || "Untitled Project"}
        </h1>
      </div>
    </div>
  );
}
