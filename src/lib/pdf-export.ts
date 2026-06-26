import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^\w.-]/g, "_").replace(/\.pdf$/i, "");
  return `${base || "document"}.pdf`;
}

function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const INLINE_STYLE_PROPS = [
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "boxShadow",
  "fontSize",
  "fontWeight",
  "fontFamily",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "padding",
  "margin",
  "borderWidth",
  "borderStyle",
  "borderRadius",
  "display",
  "width",
  "maxWidth",
  "minWidth",
  "height",
  "gap",
  "gridTemplateColumns",
  "flexDirection",
  "alignItems",
  "justifyContent",
] as const;

function inlineComputedStyles(source: Element, clone: HTMLElement): void {
  const sourceNodes = [source, ...source.querySelectorAll("*")];
  const cloneNodes = [clone, ...clone.querySelectorAll("*")];

  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index] as HTMLElement | undefined;
    if (!cloneNode) return;

    const computed = window.getComputedStyle(sourceNode);
    for (const prop of INLINE_STYLE_PROPS) {
      const value = computed[prop];
      if (value) {
        cloneNode.style[prop] = value;
      }
    }
  });
}

function prepareCloneForExport(
  clonedDoc: Document,
  elementId: string,
  sourceElement: HTMLElement
): void {
  clonedDoc.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => {
    node.remove();
  });

  const cloned = clonedDoc.getElementById(elementId);
  if (!cloned) return;

  cloned.querySelectorAll<HTMLElement>(".no-print").forEach((el) => {
    el.style.display = "none";
  });

  cloned.style.background = "#ffffff";
  inlineComputedStyles(sourceElement, cloned);
}

export async function downloadPdf(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Invoice element not found");
  }

  const safeFilename = sanitizeFilename(filename);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: element.scrollWidth,
    onclone: (clonedDoc) => {
      prepareCloneForExport(clonedDoc, elementId, element);
    },
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  let imgWidth = contentWidth;
  let imgHeight = (canvas.height * contentWidth) / canvas.width;

  if (imgHeight > contentHeight) {
    imgHeight = contentHeight;
    imgWidth = (canvas.width * contentHeight) / canvas.height;
  }

  pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);

  const blob = pdf.output("blob");
  triggerFileDownload(blob, safeFilename);
}
