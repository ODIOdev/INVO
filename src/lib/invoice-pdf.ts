import jsPDF from "jspdf";
import {
  calculateDraftTotals,
  formatMoney,
  type DraftState,
} from "@/lib/drafts";

const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 12;

const SP = {
  section: 8,
  field: 6,
  row: 5,
  afterBox: 10,
} as const;

const TABLE = {
  item: { x: MARGIN, w: 32 },
  desc: { x: MARGIN + 32, w: 58 },
  qty: { x: MARGIN + 90, w: 14 },
  rate: { x: MARGIN + 104, w: 28 },
  amount: { x: MARGIN + 132, w: CONTENT_W - 132 },
} as const;

function formatDisplayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function moneyForPdf(amount: number): string {
  return formatMoney(amount).replace(/\u2212/g, "-");
}

async function loadLogoBase64(): Promise<string | null> {
  if (typeof window === "undefined") {
    try {
      const { readFile } = await import("fs/promises");
      const pathModule = await import("path");
      const buffer = await readFile(
        pathModule.join(process.cwd(), "public", "overdrive-logo.png")
      );
      return `data:image/png;base64,${buffer.toString("base64")}`;
    } catch {
      return null;
    }
  }

  try {
    const response = await fetch("/overdrive-logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed <= FOOTER_Y - 4) return y;
  pdf.addPage();
  return MARGIN;
}

function sectionLabel(pdf: jsPDF, text: string, x: number, y: number): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(110, 110, 110);
  pdf.text(text.toUpperCase(), x, y);
  return y + 4;
}

function compactField(
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
): number {
  const trimmed = value.trim();
  if (!trimmed) return y;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  pdf.setTextColor(130, 130, 130);
  pdf.text(label.toUpperCase(), x, y);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(30, 30, 30);
  const lines = pdf.splitTextToSize(trimmed, width);
  pdf.text(lines, x, y + 3.2);
  return y + 3.2 + lines.length * SP.row + SP.field - 2;
}

function drawBox(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: [number, number, number] = [255, 255, 255]
): void {
  pdf.setFillColor(fill[0], fill[1], fill[2]);
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, w, h, "F");
  pdf.rect(x, y, w, h, "S");
}

function drawRule(pdf: jsPDF, y: number, inset = 0): number {
  pdf.setDrawColor(225, 225, 225);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN + inset, y, PAGE_W - MARGIN - inset, y);
  return y + SP.section;
}

function fieldHeight(
  pdf: jsPDF,
  value: string,
  width: number
): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const lines = pdf.splitTextToSize(trimmed, width);
  return 3.2 + lines.length * SP.row + SP.field - 2;
}

function drawInfoBox(
  pdf: jsPDF,
  state: DraftState,
  startY: number
): number {
  const colW = CONTENT_W / 2;
  const leftX = MARGIN + 6;
  const rightX = MARGIN + colW + 6;
  const innerW = colW - 12;
  const pad = 6;

  const leftFields = [
    ["Name", state.client.clientName],
    ["Company", state.client.companyName],
    ["Email", state.client.email],
    ["Phone", state.client.phone],
    ["Website", state.client.url],
  ] as const;

  const rightFields = [
    ["Project", state.client.projectName],
    [`${state.docType} #`, state.client.documentNumber],
    ["Issued", formatDisplayDate(state.client.issueDate)],
    ["Due", formatDisplayDate(state.client.dueDate)],
  ] as const;

  let leftH = 4;
  let rightH = 4;
  for (const [, value] of leftFields) {
    leftH += fieldHeight(pdf, value, innerW);
  }
  for (const [, value] of rightFields) {
    rightH += fieldHeight(pdf, value, innerW);
  }

  const boxH = Math.max(leftH, rightH) + pad * 2;

  drawBox(pdf, MARGIN, startY, CONTENT_W, boxH, [252, 252, 252]);
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN + colW, startY, MARGIN + colW, startY + boxH);

  let leftY = startY + pad;
  let rightY = startY + pad;
  leftY = sectionLabel(pdf, "Bill To", leftX, leftY);
  rightY = sectionLabel(pdf, "Project Details", rightX, rightY);

  for (const [label, value] of leftFields) {
    leftY = compactField(pdf, label, value, leftX, leftY, innerW);
  }
  for (const [label, value] of rightFields) {
    rightY = compactField(pdf, label, value, rightX, rightY, innerW);
  }

  return startY + boxH + SP.afterBox;
}

function drawLineItems(pdf: jsPDF, state: DraftState, startY: number): number {
  let y = ensureSpace(pdf, startY, 20);
  y = sectionLabel(pdf, "Line Items", MARGIN, y);
  y += 2;

  let headerTop = y;
  const headerH = 8;
  drawBox(pdf, MARGIN, headerTop, CONTENT_W, headerH, [245, 246, 248]);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(90, 90, 90);
  const headerY = headerTop + 5.5;
  pdf.text("Item", TABLE.item.x + 3, headerY);
  pdf.text("Description", TABLE.desc.x + 3, headerY);
  pdf.text("Qty", TABLE.qty.x + TABLE.qty.w / 2, headerY, { align: "center" });
  pdf.text("Rate", TABLE.rate.x + TABLE.rate.w - 2, headerY, { align: "right" });
  pdf.text("Amount", TABLE.amount.x + TABLE.amount.w - 3, headerY, {
    align: "right",
  });

  y = headerTop + headerH;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 30, 30);

  let tableBottom = y;

  for (let i = 0; i < state.services.length; i++) {
    const item = state.services[i];
    const itemLines = pdf.splitTextToSize(
      item.service.trim() || "-",
      TABLE.item.w - 6
    );
    const descLines = pdf.splitTextToSize(
      item.description.trim() || "-",
      TABLE.desc.w - 6
    );
    const rowH = Math.max(itemLines.length, descLines.length, 1) * SP.row + 6;

    const nextY = ensureSpace(pdf, y, rowH + 2);
    if (nextY !== y) {
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.3);
      pdf.rect(MARGIN, headerTop, CONTENT_W, tableBottom - headerTop, "S");
      y = nextY;
      headerTop = y;
      tableBottom = y;
      drawBox(pdf, MARGIN, headerTop, CONTENT_W, headerH, [245, 246, 248]);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(90, 90, 90);
      const headerY = headerTop + 5.5;
      pdf.text("Item", TABLE.item.x + 3, headerY);
      pdf.text("Description", TABLE.desc.x + 3, headerY);
      pdf.text("Qty", TABLE.qty.x + TABLE.qty.w / 2, headerY, { align: "center" });
      pdf.text("Rate", TABLE.rate.x + TABLE.rate.w - 2, headerY, { align: "right" });
      pdf.text("Amount", TABLE.amount.x + TABLE.amount.w - 3, headerY, {
        align: "right",
      });
      y = headerTop + headerH;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(30, 30, 30);
    }

    if (i % 2 === 1) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }

    const textY = y + 4.5;
    pdf.setTextColor(30, 30, 30);
    pdf.text(itemLines, TABLE.item.x + 3, textY);
    pdf.text(descLines, TABLE.desc.x + 3, textY);
    pdf.text(String(item.quantity), TABLE.qty.x + TABLE.qty.w / 2, textY, {
      align: "center",
    });
    pdf.text(moneyForPdf(item.unitPrice), TABLE.rate.x + TABLE.rate.w - 2, textY, {
      align: "right",
    });
    pdf.text(
      moneyForPdf(item.quantity * item.unitPrice),
      TABLE.amount.x + TABLE.amount.w - 3,
      textY,
      { align: "right" }
    );

    pdf.setDrawColor(235, 235, 235);
    pdf.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH);
    y += rowH;
    tableBottom = y;
  }

  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.3);
  pdf.rect(MARGIN, headerTop, CONTENT_W, tableBottom - headerTop, "S");

  return y + SP.afterBox;
}

function drawBottomPanels(
  pdf: jsPDF,
  state: DraftState,
  startY: number
): number {
  const totals = calculateDraftTotals(state);
  const taxLabel = "Tax";

  const summaryW = 82;
  const summaryX = PAGE_W - MARGIN - summaryW;
  const laborW = CONTENT_W - summaryW - 8;
  const hasLabor =
    Boolean(state.laborTitle.trim()) ||
    state.laborHours > 0 ||
    state.laborRate > 0;

  const rows: Array<[string, string, boolean?]> = [
    ["Services", moneyForPdf(totals.serviceSubtotal)],
    ["Labor", moneyForPdf(totals.laborTotal)],
    ["Subtotal", moneyForPdf(totals.subtotal)],
    [taxLabel, moneyForPdf(totals.taxAmount)],
    ["Total", moneyForPdf(totals.grandTotal), true],
  ];
  if (totals.deposit > 0) {
    rows.push(["Deposit", `-${moneyForPdf(totals.deposit)}`]);
  }

  const summaryH = 10 + rows.length * 5 + 16;
  const laborTitleLines = state.laborTitle.trim()
    ? pdf.splitTextToSize(state.laborTitle.trim(), laborW - 12).length
    : 0;
  const laborH = hasLabor
    ? 10 + laborTitleLines * SP.row + 14 + 10
    : 0;
  const panelH = Math.max(summaryH, laborH, 48);
  const panelTop = ensureSpace(pdf, startY, panelH + 4);

  if (hasLabor) {
    drawBox(pdf, MARGIN, panelTop, laborW, panelH, [255, 255, 255]);
  }
  drawBox(pdf, summaryX, panelTop, summaryW, panelH, [255, 255, 255]);

  if (hasLabor) {
    let ly = panelTop + 6;
    ly = sectionLabel(pdf, "Labor", MARGIN + 6, ly);

    if (state.laborTitle.trim()) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(30, 30, 30);
      const titleLines = pdf.splitTextToSize(
        state.laborTitle.trim(),
        laborW - 12
      );
      pdf.text(titleLines, MARGIN + 6, ly + 2);
      ly += 2 + titleLines.length * SP.row;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 100, 100);
    pdf.text(
      `${state.laborHours || 0} hrs @ ${moneyForPdf(state.laborRate)}`,
      MARGIN + 6,
      ly + 4
    );
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(25, 25, 25);
    pdf.text(
      moneyForPdf(totals.laborTotal),
      MARGIN + laborW - 6,
      panelTop + panelH - 8,
      { align: "right" }
    );
  }

  let sy = sectionLabel(pdf, "Summary", summaryX + 6, panelTop + 6);
  sy += 2;

  pdf.setFontSize(8.5);
  for (const [label, value, bold] of rows) {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setTextColor(bold ? 40 : 100, bold ? 40 : 100, bold ? 40 : 100);
    pdf.text(label, summaryX + 6, sy);
    pdf.setTextColor(30, 30, 30);
    pdf.text(value, summaryX + summaryW - 6, sy, { align: "right" });
    sy += 5;
  }

  sy += 2;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.25);
  pdf.line(summaryX + 6, sy, summaryX + summaryW - 6, sy);
  sy += 5;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(25, 25, 25);
  pdf.text("Total Due", summaryX + 6, sy);
  pdf.setFontSize(12);
  pdf.text(moneyForPdf(totals.balanceDue), summaryX + summaryW - 6, sy, {
    align: "right",
  });

  return panelTop + panelH + SP.afterBox;
}

export function getInvoicePdfFilename(state: DraftState): string {
  const base = (state.client.documentNumber || state.docType)
    .replace(/[^\w.-]/g, "_")
    .replace(/\.pdf$/i, "");
  return `${base || "document"}.pdf`;
}

async function buildInvoicePdfDocument(state: DraftState): Promise<jsPDF> {
  const pdf = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  let y = MARGIN;

  const logo = await loadLogoBase64();
  const headerH = 20;

  if (logo) {
    pdf.addImage(logo, "PNG", MARGIN, y, 40, 14);
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(25, 25, 25);
    pdf.text("Over Drive OS", MARGIN, y + 9);
  }

  const metaX = PAGE_W - MARGIN;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(110, 110, 110);
  pdf.text(state.docType.toUpperCase(), metaX, y + 4, { align: "right" });

  pdf.setFontSize(14);
  pdf.setTextColor(20, 20, 20);
  pdf.text(
    state.client.projectName.trim() || "Untitled Project",
    metaX,
    y + 11,
    { align: "right" }
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(90, 90, 90);
  pdf.text(state.client.documentNumber, metaX, y + 16, { align: "right" });

  y += headerH;
  y = drawRule(pdf, y);

  y = drawInfoBox(pdf, state, y);
  y = drawLineItems(pdf, state, y);
  y = drawBottomPanels(pdf, state, y);

  if (state.notes.trim()) {
    y = ensureSpace(pdf, y, 14);
    y = sectionLabel(pdf, "Notes & Terms", MARGIN, y);
    y += 2;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(70, 70, 70);
    for (const line of pdf.splitTextToSize(state.notes.trim(), CONTENT_W)) {
      y = ensureSpace(pdf, y, SP.row);
      pdf.text(line, MARGIN, y);
      y += SP.row;
    }
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(150, 150, 150);
  pdf.text("www.overdriveio.com", PAGE_W / 2, FOOTER_Y, { align: "center" });

  return pdf;
}

export async function generateInvoicePdfBlob(
  state: DraftState
): Promise<Blob> {
  const pdf = await buildInvoicePdfDocument(state);
  return pdf.output("blob");
}

export async function generateInvoicePdfBuffer(
  state: DraftState
): Promise<Buffer> {
  const pdf = await buildInvoicePdfDocument(state);
  return Buffer.from(pdf.output("arraybuffer"));
}
