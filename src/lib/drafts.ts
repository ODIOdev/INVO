export type DocType = "Quote" | "Invoice";

/** Tax rate stored as a whole-number percent: 0, 7, 8, or 9 */
export type TaxRatePercent = 0 | 7 | 8 | 9;

export type ServiceItem = {
  id: number;
  service: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type ClientInfo = {
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  url: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  projectName: string;
  documentNumber: string;
  issueDate: string;
  dueDate: string;
};

export type DraftState = {
  docType: DocType;
  taxRate: number;
  client: ClientInfo;
  services: ServiceItem[];
  laborTitle: string;
  laborHours: number;
  laborRate: number;
  deposit: number;
  amountPaid?: number;
  notes: string;
  catalogClientId?: string;
};

export type SavedDraft = {
  id: string;
  savedAt: string;
  state: DraftState;
};

const DRAFTS_KEY = "overdrive-invoice-drafts";
const LEGACY_DRAFT_KEY = "overdrive-invoice-draft";

export function normalizeTaxRate(taxRate: number): TaxRatePercent {
  if (!taxRate) return 0;
  if (taxRate > 0 && taxRate < 1) {
    const pct = Math.round(taxRate * 100);
    if (pct === 7 || pct === 8 || pct === 9) return pct;
    return 8;
  }
  if (taxRate === 7 || taxRate === 8 || taxRate === 9) return taxRate;
  return 8;
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function getDefaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split("T")[0];
}

export function generateDocumentNumber(docType: DocType): string {
  const prefix = docType === "Quote" ? "QTE" : "INV";
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

export function createDefaultState(docType: DocType = "Quote"): DraftState {
  return {
    docType,
    taxRate: 8,
    client: {
      clientName: "",
      companyName: "",
      email: "",
      phone: "",
      url: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      projectName: "",
      documentNumber: generateDocumentNumber(docType),
      issueDate: getTodayDate(),
      dueDate: getDefaultDueDate(),
    },
    services: [
      {
        id: 1,
        service: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
      },
    ],
    laborTitle: "",
    laborHours: 0,
    laborRate: 0,
    deposit: 0,
    amountPaid: 0,
    notes: "",
  };
}

export function createDemoDraftState(docType: DocType = "Quote"): DraftState {
  const state = createDefaultState(docType);
  state.client = {
    ...state.client,
    clientName: "Demo Client",
    companyName: "Demo Company LLC",
    email: "demo@overdrive.io",
    phone: "(555) 123-4567",
    url: "www.demo.overdrive.io",
    projectName: "Demo Storage Project",
  };
  state.services = [
    {
      id: 1,
      service: "Consulting",
      description: "Strategy and planning session",
      quantity: 4,
      unitPrice: 125,
    },
    {
      id: 2,
      service: "Implementation",
      description: "Setup and configuration",
      quantity: 2,
      unitPrice: 200,
    },
  ];
  state.laborTitle = "On-site support";
  state.laborHours = 6;
  state.laborRate = 85;
  state.deposit = 250;
  state.notes = "Demo record — payment due within 30 days of invoice date.";
  return state;
}

export function isBlankDraftState(state: DraftState): boolean {
  const { client, services, laborTitle, laborHours, laborRate, deposit, notes } =
    state;

  const clientEmpty =
    !client.clientName.trim() &&
    !client.companyName.trim() &&
    !client.email.trim() &&
    !client.phone.trim() &&
    !client.url.trim() &&
    !client.addressLine1.trim() &&
    !client.addressLine2.trim() &&
    !client.city.trim() &&
    !client.state.trim() &&
    !client.zipCode.trim() &&
    !client.projectName.trim();

  const servicesEmpty =
    services.length <= 1 &&
    services.every(
      (item) =>
        !item.service.trim() &&
        !item.description.trim() &&
        item.quantity === 1 &&
        item.unitPrice === 0
    );

  return (
    clientEmpty &&
    servicesEmpty &&
    !laborTitle.trim() &&
    laborHours === 0 &&
    laborRate === 0 &&
    !notes.trim() &&
    (deposit ?? 0) === 0 &&
    (state.amountPaid ?? 0) === 0
  );
}

export function calculateGrandTotal(state: DraftState): number {
  return calculateDraftTotals(state).grandTotal;
}

export function calculateDraftTotals(state: DraftState) {
  const serviceSubtotal = state.services.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const laborTotal = state.laborHours * state.laborRate;
  const subtotal = serviceSubtotal + laborTotal;
  const taxPercent = normalizeTaxRate(state.taxRate);
  const taxAmount = subtotal * (taxPercent / 100);
  const grandTotal = subtotal + taxAmount;
  const deposit = state.deposit ?? 0;
  const amountPaid = state.amountPaid ?? 0;
  const balanceDue = Math.max(0, grandTotal - deposit - amountPaid);

  return {
    serviceSubtotal,
    laborTotal,
    subtotal,
    taxAmount,
    grandTotal,
    deposit,
    amountPaid,
    balanceDue,
  };
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function formatMoneyInput(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrencyInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeClientInfo(client: Partial<ClientInfo>): ClientInfo {
  return {
    clientName: client.clientName ?? "",
    companyName: client.companyName ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    url: client.url ?? "",
    addressLine1: client.addressLine1 ?? "",
    addressLine2: client.addressLine2 ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    zipCode: client.zipCode ?? "",
    projectName: client.projectName ?? "",
    documentNumber: client.documentNumber ?? "",
    issueDate: client.issueDate ?? "",
    dueDate: client.dueDate ?? "",
  };
}

function normalizeDraftState(state: DraftState): DraftState {
  return {
    ...state,
    client: normalizeClientInfo(state.client),
  };
}

function readDrafts(): SavedDraft[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(DRAFTS_KEY);
  if (!raw) return [];
  try {
    const drafts = JSON.parse(raw) as SavedDraft[];
    return drafts.map((draft) => ({
      ...draft,
      state: normalizeDraftState(draft.state),
    }));
  } catch {
    return [];
  }
}

function writeDrafts(drafts: SavedDraft[]): void {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function migrateLegacyDraft(): void {
  if (typeof window === "undefined") return;
  const legacy = localStorage.getItem(LEGACY_DRAFT_KEY);
  if (!legacy) return;

  try {
    const state = normalizeDraftState(JSON.parse(legacy) as DraftState);
    const drafts = readDrafts();
    const alreadyMigrated = drafts.some(
      (d) => d.state.client.documentNumber === state.client.documentNumber
    );
    if (!alreadyMigrated) {
      drafts.unshift({
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        state,
      });
      writeDrafts(drafts);
    }
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  } catch {
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  }
}

export function listDrafts(): SavedDraft[] {
  migrateLegacyDraft();
  return readDrafts().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function getDraft(id: string): SavedDraft | null {
  migrateLegacyDraft();
  return readDrafts().find((d) => d.id === id) ?? null;
}

export function saveDraftToLibrary(
  state: DraftState,
  id?: string | null
): string {
  migrateLegacyDraft();
  const drafts = readDrafts();
  const savedAt = new Date().toISOString();

  if (id) {
    const index = drafts.findIndex((d) => d.id === id);
    if (index >= 0) {
      drafts[index] = { id, savedAt, state };
      writeDrafts(drafts);
      return id;
    }
  }

  const newId = crypto.randomUUID();
  drafts.unshift({ id: newId, savedAt, state });
  writeDrafts(drafts);
  return newId;
}

export function deleteDraft(id: string): void {
  writeDrafts(readDrafts().filter((d) => d.id !== id));
}

export function clearAllDrafts(): void {
  writeDrafts([]);
}

export function formatSavedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
