import { Suspense } from "react";
import InvoiceSystem from "@/components/InvoiceSystem";

export const metadata = {
  title: "Invoice & Quote — Over Drive OS",
  description: "Create and manage quotes and invoices.",
};

export default function InvoicePage() {
  return (
    <Suspense>
      <InvoiceSystem />
    </Suspense>
  );
}
