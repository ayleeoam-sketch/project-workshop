import type { PdfPosition } from "./recognition";

export interface FieldDef {
  key: string;
  label: string;
  field_type: string;
  required: boolean;
  options: string[];
  position: PdfPosition | null;
}

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function missingRequired(fields: FieldDef[], values: Record<string, string>) {
  return fields.filter((f) => f.required && !String(values[f.key] ?? "").trim()).map((f) => f.label);
}

export function formatValue(field: FieldDef, raw: string) {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (field.field_type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(v + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  if (field.field_type === "number" && !isNaN(Number(v))) return Number(v).toLocaleString("en-NG");
  return v;
}

/** Fill {{key}} placeholders in a DOCX. Everything else (logos, tables, letterheads, signatures) is untouched. */
export async function fillDocx(template: ArrayBuffer, fields: FieldDef[], values: Record<string, string>) {
  const PizZip = (await import("pizzip")).default;
  const Docxtemplater = (await import("docxtemplater")).default;
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    nullGetter: () => "",
  });
  const data: Record<string, string> = {};
  for (const f of fields) data[f.key] = formatValue(f, values[f.key] ?? "");
  doc.render(data);
  return doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME }) as Blob;
}

/** Draw values at each field's mapped position on top of the original PDF. */
export async function fillPdf(template: ArrayBuffer, fields: FieldDef[], values: Record<string, string>) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.load(template);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  for (const f of fields) {
    const text = formatValue(f, values[f.key] ?? "").replace(/₦/g, "N");
    if (!text || !f.position) continue;
    const page = pages[f.position.page - 1];
    if (!page) continue;
    page.drawText(text, { x: f.position.x, y: f.position.y, size: f.position.size || 11, font, color: rgb(0.1, 0.1, 0.1) });
  }
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export async function fillTemplate(fileType: string, template: ArrayBuffer, fields: FieldDef[], values: Record<string, string>) {
  return fileType === "pdf" ? fillPdf(template, fields, values) : fillDocx(template, fields, values);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function safeFileName(s: string) {
  return s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_").slice(0, 80) || "document";
}
