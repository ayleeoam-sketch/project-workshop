import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Download } from "lucide-react";
import { PageHeader, Panel, SelectBox, DataTable } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { downloadFromStorage, fetchTemplateFields, logActivity, meQuery, saveGeneratedDocument } from "@/lib/data";
import { downloadBlob, fillTemplate, missingRequired, safeFileName, type FieldDef } from "@/lib/generate";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/bulk")({
  head: () => pageHead("Bulk Generator", "Generate many documents at once from Excel or CSV."),
  component: Bulk,
});

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function Bulk() {
  const qc = useQueryClient();
  const { data: me } = useQuery(meQuery);
  const { data: templates } = useQuery({
    queryKey: ["templates", "active"],
    queryFn: async () => (await supabase.from("templates").select("id,name,file_type,storage_path").eq("status", "active").order("name")).data ?? [],
  });
  const [templateId, setTemplateId] = useState("");
  const template = templates?.find((t) => t.id === templateId);
  const { data: fields } = useQuery({ queryKey: ["fields", templateId], enabled: !!templateId, queryFn: () => fetchTemplateFields(templateId) });
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [results, setResults] = useState<{ name: string; blob?: Blob; error?: string }[]>([]);
  const [zip, setZip] = useState<Blob | null>(null);

  async function onFile(file: File) {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return toast.error("Upload an .xlsx, .xls or .csv file");
    if (file.size > 10 * 1024 * 1024) return toast.error("Spreadsheet must be under 10 MB");
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]!]!;
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    if (!data.length) return toast.error("No rows found in the first sheet");
    if (data.length > 500) return toast.error("Up to 500 rows per batch");
    const cols = Object.keys(data[0]!);
    setColumns(cols);
    setRows(data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "")]))));
    const auto: Record<string, string> = {};
    for (const f of fields ?? []) {
      const c = cols.find((c) => norm(c) === norm(f.key) || norm(c) === norm(f.label));
      if (c) auto[f.key] = c;
    }
    setMapping(auto);
    setResults([]); setZip(null);
  }

  const toValues = (row: Record<string, string>, fs: FieldDef[]) =>
    Object.fromEntries(fs.map((f) => [f.key, mapping[f.key] ? row[mapping[f.key]!] ?? "" : ""]));

  async function run() {
    if (!template || !fields || !me) return;
    const unmapped = fields.filter((f) => f.required && !mapping[f.key]);
    if (unmapped.length) return toast.error(`Map required fields: ${unmapped.map((f) => f.label).join(", ")}`);
    setProgress(0); setResults([]); setZip(null);
    const buffer = await (await downloadFromStorage("templates", template.storage_path)).arrayBuffer();
    const JSZip = (await import("jszip")).default;
    const z = new JSZip();
    const batchId = crypto.randomUUID();
    const out: typeof results = [];
    const format = template.file_type as "docx" | "pdf";
    for (let i = 0; i < rows.length; i++) {
      const values = toValues(rows[i]!, fields);
      const first = fields.map((f) => values[f.key]).find((v) => v?.trim());
      const title = `${template.name} — ${first || `Row ${i + 1}`}`;
      const name = `${String(i + 1).padStart(3, "0")}_${safeFileName(first || "row")}.${format}`;
      const miss = missingRequired(fields, values);
      if (miss.length) { out.push({ name, error: `Missing ${miss.join(", ")}` }); }
      else {
        try {
          const blob = await fillTemplate(format, buffer.slice(0), fields, values);
          await saveGeneratedDocument({ userId: me.user.id, templateId: template.id, templateName: template.name, title, format, blob, data: values, batchId });
          z.file(name, blob);
          out.push({ name, blob });
        } catch (e) { out.push({ name, error: e instanceof Error ? e.message : "Failed" }); }
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100));
      setResults([...out]);
    }
    const ok = out.filter((r) => r.blob).length;
    await logActivity("Bulk generated", "batch", batchId, { template: template.name, count: ok, failed: out.length - ok });
    if (ok) setZip(await z.generateAsync({ type: "blob" }));
    toast.success(`${ok} of ${rows.length} documents generated`);
    qc.invalidateQueries({ queryKey: ["documents"] });
  }

  return (
    <>
      <PageHeader title="Bulk Document Generator" description="Turn a spreadsheet into many finished documents." />
      <div className="grid gap-6">
        <Panel title="1. Template and spreadsheet">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tpl">Template</Label>
              <SelectBox id="tpl" className="mt-2" value={templateId} onChange={(e) => { setTemplateId(e.target.value); setRows([]); setColumns([]); }}>
                <option value="">Select a template…</option>
                {templates?.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.file_type.toUpperCase()})</option>)}
              </SelectBox>
            </div>
            <div>
              <Label htmlFor="sheet">Excel or CSV file</Label>
              <label htmlFor="sheet" className={`mt-2 flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 text-sm ${fields ? "" : "pointer-events-none opacity-50"}`}>
                <FileSpreadsheet className="h-4 w-4 text-primary" /> {rows.length ? `${rows.length} rows loaded` : "Choose file…"}
              </label>
              <input id="sheet" type="file" accept=".xlsx,.xls,.csv" className="sr-only" disabled={!fields}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
            </div>
          </div>
        </Panel>

        {rows.length > 0 && fields && (
          <Panel title="2. Match columns to fields">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <Label>{f.label}{f.required && <span className="text-primary"> *</span>}</Label>
                  <SelectBox className="mt-1.5" value={mapping[f.key] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}>
                    <option value="">— not mapped —</option>
                    {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                  </SelectBox>
                </div>
              ))}
            </div>
            <h3 className="mb-2 mt-6 text-sm font-semibold">Preview (first 5 records)</h3>
            <DataTable head={fields.map((f) => f.label)} rows={rows.slice(0, 5).map((r) => { const v = toValues(r, fields); return fields.map((f) => v[f.key] || <span className="text-muted-foreground">—</span>); })} />
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button onClick={run} disabled={progress !== null && progress < 100}>Generate {rows.length} documents</Button>
              {progress !== null && <div className="w-48"><Progress value={progress} /></div>}
              {zip && <Button variant="outline" onClick={() => downloadBlob(zip, `${safeFileName(template!.name)}_batch.zip`)}><Download /> Download ZIP</Button>}
            </div>
          </Panel>
        )}

        {results.length > 0 && (
          <Panel title="3. Results">
            <ul className="divide-y text-sm">
              {results.map((r) => (
                <li key={r.name} className="flex items-center justify-between py-2">
                  <span>{r.name}</span>
                  {r.blob ? <Button size="sm" variant="ghost" onClick={() => downloadBlob(r.blob!, r.name)}><Download /> Download</Button>
                    : <span className="text-destructive">{r.error}</span>}
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
