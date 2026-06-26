export type DocumentMode = "quote" | "invoice";
export type TaxRate = 7 | 8 | 9;

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface LaborItem {
  title: string;
  hours: number;
  hourlyRate: number;
}

export interface ClientInfo {
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  projectName: string;
  documentNumber: string;
  issueDate: string;
  dueDate: string;
}

export interface InvoiceDocument {
  mode: DocumentMode;
  client: ClientInfo;
  services: ServiceItem[];
  labor: LaborItem;
  taxRate: TaxRate;
  notes: string;
}

export interface InvoiceTotals {
  servicesSubtotal: number;
  laborSubtotal: number;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
}
