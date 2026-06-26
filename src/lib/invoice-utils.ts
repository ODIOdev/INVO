import type {
  InvoiceDocument,
  InvoiceTotals,
  ServiceItem,
  TaxRate,
} from "@/types/invoice";

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

export function calculateTotals(
  services: ServiceItem[],
  laborHours: number,
  laborRate: number,
  taxRate: TaxRate
): InvoiceTotals {
  const servicesSubtotal = services.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice),
    0
  );
  const laborSubtotal = laborHours * laborRate;
  const subtotal = servicesSubtotal + laborSubtotal;
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  return {
    servicesSubtotal,
    laborSubtotal,
    subtotal,
    taxAmount,
    grandTotal,
  };
}

export function createEmptyService(): ServiceItem {
  return {
    id: generateId(),
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
  };
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function getDefaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split("T")[0];
}

export function generateDocumentNumber(mode: "quote" | "invoice"): string {
  const prefix = mode === "quote" ? "QTE" : "INV";
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}`;
}

export function createDefaultDocument(mode: "quote" | "invoice" = "quote"): InvoiceDocument {
  return {
    mode,
    client: {
      clientName: "",
      companyName: "",
      email: "",
      phone: "",
      projectName: "",
      documentNumber: generateDocumentNumber(mode),
      issueDate: getTodayDate(),
      dueDate: getDefaultDueDate(),
    },
    services: [createEmptyService()],
    labor: {
      title: "",
      hours: 0,
      hourlyRate: 0,
    },
    taxRate: 8,
    notes: "",
  };
}

const DRAFT_STORAGE_KEY = "overdrive-invoice-draft";

export function saveDraft(document: InvoiceDocument): void {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(document));
}

export function loadDraft(): InvoiceDocument | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InvoiceDocument;
  } catch {
    return null;
  }
}

export function convertQuoteToInvoice(document: InvoiceDocument): InvoiceDocument {
  return {
    ...document,
    mode: "invoice",
    client: {
      ...document.client,
      documentNumber: generateDocumentNumber("invoice"),
    },
  };
}
