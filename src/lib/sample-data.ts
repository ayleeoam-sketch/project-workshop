// SAMPLE DATA ONLY — replaced by database queries in the backend stage.
export type TemplateStatus = "active" | "draft" | "archived";

export const sampleTemplates = [
  { id: "t1", name: "Admission Letter", type: "DOCX", fields: 9, version: 3, status: "active" as TemplateStatus, updated: "2026-11-01" },
  { id: "t2", name: "Payment Receipt", type: "PDF", fields: 6, version: 1, status: "active" as TemplateStatus, updated: "2026-10-29" },
  { id: "t3", name: "Certificate of Origin", type: "DOCX", fields: 7, version: 2, status: "active" as TemplateStatus, updated: "2026-10-24" },
  { id: "t4", name: "Staff ID Attestation", type: "PDF", fields: 5, version: 1, status: "draft" as TemplateStatus, updated: "2026-10-20" },
  { id: "t5", name: "Clearance Form 2025", type: "DOCX", fields: 8, version: 4, status: "archived" as TemplateStatus, updated: "2026-09-12" },
];

export const sampleDocuments = [
  { id: "d1", title: "Admission Letter — Adebayo Tolu", template: "Admission Letter", by: "Grace Okon", format: "PDF", created: "2026-11-02 14:20" },
  { id: "d2", title: "Receipt — Chukwu Emeka", template: "Payment Receipt", by: "Ayomide O.", format: "PDF", created: "2026-11-02 11:05" },
  { id: "d3", title: "Certificate — Bello Fatima", template: "Certificate of Origin", by: "Grace Okon", format: "DOCX", created: "2026-11-01 16:42" },
  { id: "d4", title: "Admission Letter — Ibe Chioma", template: "Admission Letter", by: "Musa Ali", format: "DOCX", created: "2026-11-01 09:18" },
  { id: "d5", title: "Receipt — Okafor Daniel", template: "Payment Receipt", by: "Musa Ali", format: "PDF", created: "2026-10-31 13:30" },
];

export const sampleStaff = [
  { id: "s1", name: "Ayomide Olurankinse", email: "ayomide@ay-lee.com", role: "ADMIN", status: "active", docs: 142 },
  { id: "s2", name: "Grace Okon", email: "grace@ay-lee.com", role: "STAFF", status: "active", docs: 87 },
  { id: "s3", name: "Musa Ali", email: "musa@ay-lee.com", role: "STAFF", status: "active", docs: 54 },
  { id: "s4", name: "Ngozi Eze", email: "ngozi@ay-lee.com", role: "STAFF", status: "suspended", docs: 12 },
];

export const sampleActivity = [
  { id: "a1", actor: "Ayomide O.", action: "Uploaded template", target: "Admission Letter v3", at: "2026-11-02 15:01" },
  { id: "a2", actor: "Grace Okon", action: "Generated document", target: "Admission Letter — Adebayo Tolu", at: "2026-11-02 14:20" },
  { id: "a3", actor: "Ayomide O.", action: "Suspended staff", target: "Ngozi Eze", at: "2026-11-02 10:12" },
  { id: "a4", actor: "Musa Ali", action: "Bulk generated", target: "24 × Payment Receipt", at: "2026-11-01 17:45" },
  { id: "a5", actor: "Ayomide O.", action: "Archived template", target: "Clearance Form 2025", at: "2026-10-30 09:00" },
];

export const sampleFields = [
  { key: "full_name", label: "Full name", type: "text", required: true },
  { key: "matric_number", label: "Matric number", type: "text", required: true },
  { key: "department", label: "Department", type: "text", required: true },
  { key: "state_of_origin", label: "State of origin", type: "select", required: false },
  { key: "amount", label: "Amount (₦)", type: "number", required: false },
  { key: "issue_date", label: "Issue date", type: "date", required: true },
];
