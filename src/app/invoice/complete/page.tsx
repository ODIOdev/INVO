import { Suspense } from "react";
import InvoiceCompletePage from "@/components/InvoiceCompletePage";

export const metadata = {
  title: "Invoice Complete — Over Drive OS",
  description: "Your invoice is ready to print or download.",
};

export default function InvoiceCompleteRoute() {
  return (
    <Suspense>
      <InvoiceCompletePage />
    </Suspense>
  );
}
