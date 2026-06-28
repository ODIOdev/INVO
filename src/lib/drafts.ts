export type DocType = "Quote" | "Invoice";

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
  notes: string;
};

export type SavedDraft = {
  id: string;
  savedAt: string;
  state: DraftState;
};

const DRAFTS_KEY = "overdrive-invoice-drafts";
const LEGACY_DRAFT_KEY = "overdrive-invoice-draft";

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
    taxRate: 0.08,
    client: {
      clientName: "",
      companyName: "",
      email: "",
      phone: "",
      url: "",
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
    (deposit ?? 0) === 0
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
  const taxAmount = subtotal * state.taxRate;
  const grandTotal = subtotal + taxAmount;
  const deposit = state.deposit ?? 0;
  const balanceDue = Math.max(0, grandTotal - deposit);

  return {
    serviceSubtotal,
    laborTotal,
    subtotal,
    taxAmount,
    grandTotal,
    deposit,
    balanceDue,
  };
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function readDrafts(): SavedDraft[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(DRAFTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedDraft[];
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
    const state = JSON.parse(legacy) as DraftState;
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
