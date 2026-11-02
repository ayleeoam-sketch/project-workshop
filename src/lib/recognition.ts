// Template analysis: extracts text and SUGGESTS fields. Nothing here changes a
// template or saves fields — an admin must review and confirm suggestions.

export type FieldType = "text" | "number" | "date" | "select" | "textarea";

export interface PdfPosition {
  page: number; // 1-based
  x: number; // PDF points, origin bottom-left
  y: number;
  size: number;
}

export interface FieldSuggestion {
  key: string;
  label: string;
  field_type: FieldType;
  source: "placeholder" | "label";
  /** Text around the match, so the admin can see why it was suggested. */
  context: string;
  position?: PdfPosition;
}

const PATTERNS: { key: string; label: string; type: FieldType; re: RegExp }[] = [
  { key: "matric_number", label: "Matric number", type: "text", re: /\bmatric(?:ulation)?\.?\s*(?:no|number|num)\b/i },
  { key: "registration_number", label: "Registration number", type: "text", re: /\breg(?:istration)?\.?\s*(?:no|number)\b/i },
  { key: "full_name", label: "Full name", type: "text", re: /\b(?:full\s*name|name of (?:student|applicant|candidate)|surname|name)\b/i },
  { key: "department", label: "Department", type: "text", re: /\bdepartment\b|\bdept\.?\b/i },
  { key: "faculty", label: "Faculty", type: "text", re: /\bfaculty\b/i },
  { key: "level", label: "Level", type: "text", re: /\blevel\b/i },
  { key: "state_of_origin", label: "State of origin", type: "text", re: /\bstate\s+of\s+origin\b/i },
  { key: "lga", label: "Local government area", type: "text", re: /\b(?:l\.?g\.?a\.?|local\s+government(?:\s+area)?)\b/i },
  { key: "address", label: "Address", type: "textarea", re: /\b(?:home\s+|residential\s+|contact\s+)?address\b/i },
  { key: "phone_number", label: "Phone number", type: "text", re: /\b(?:phone|tel(?:ephone)?|mobile|gsm)\b/i },
  { key: "email", label: "Email", type: "text", re: /\be-?mail\b/i },
  { key: "amount", label: "Amount", type: "number", re: /\b(?:amount|sum of|total)\b|₦/i },
  { key: "date", label: "Date", type: "date", re: /\bdate\b/i },
];

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z][\w]*)\s*\}\}/g;

export function keyToLabel(key: string) {
  const s = key.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function slugifyKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "f_$1") || "field";
}

export function findPlaceholders(text: string): string[] {
  const keys = new Set<string>();
  for (const m of text.matchAll(PLACEHOLDER_RE)) keys.add(m[1]!);
  return [...keys];
}

/** Suggest fields from lines of text. Placeholders are definite; labels are guesses. */
export function suggestFromLines(lines: string[]): FieldSuggestion[] {
  const out = new Map<string, FieldSuggestion>();
  for (const line of lines) {
    for (const key of findPlaceholders(line)) {
      if (!out.has(key)) {
        const guess = PATTERNS.find((p) => p.re.test(key.replace(/_/g, " ")));
        out.set(key, { key, label: keyToLabel(key), field_type: guess?.type ?? "text", source: "placeholder", context: line.trim().slice(0, 120) });
      }
    }
  }
  for (const line of lines) {
    if (findPlaceholders(line).length) continue;
    for (const p of PATTERNS) {
      if (p.re.test(line) && !out.has(p.key)) {
        out.set(p.key, { key: p.key, label: p.label, field_type: p.type, source: "label", context: line.trim().slice(0, 120) });
        break;
      }
    }
  }
  return [...out.values()];
}

// ---------- DOCX ----------
export async function analyseDocx(buffer: ArrayBuffer) {
  const PizZip = (await import("pizzip")).default;
  const zip = new PizZip(buffer);
  const parts = Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n));
  const lines: string[] = [];
  for (const name of parts) {
    const xml = zip.file(name)!.asText();
    for (const p of xml.split(/<\/w:p>/)) {
      const text = [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
      const decoded = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
      if (decoded.trim()) lines.push(decoded);
    }
  }
  return { text: lines.join("\n"), lines, suggestions: suggestFromLines(lines) };
}

// ---------- PDF ----------
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

export async function analysePdf(buffer: ArrayBuffer) {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
  const lines: string[] = [];
  const items: { str: string; page: number; x: number; y: number; w: number; h: number }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    for (const it of content.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const t = it.transform as number[];
      items.push({ str: it.str, page: i, x: t[4]!, y: t[5]!, w: it.width, h: it.height || Math.abs(t[3]!) });
      lines.push(it.str);
    }
  }
  const suggestions = suggestFromLines(lines).map((s) => {
    const item = items.find((it) => it.str.trim().slice(0, 120) === s.context);
    if (!item) return s;
    const size = Math.max(8, Math.min(14, Math.round(item.h) || 11));
    // Placeholder: write over it. Label: write just to the right of it.
    const position: PdfPosition = s.source === "placeholder"
      ? { page: item.page, x: item.x, y: item.y, size }
      : { page: item.page, x: item.x + item.w + 6, y: item.y, size };
    return { ...s, position };
  });
  return { text: lines.join("\n"), lines, suggestions, numPages: doc.numPages, scanned: items.length === 0 };
}
