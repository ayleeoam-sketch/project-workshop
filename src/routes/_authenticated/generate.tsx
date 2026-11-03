import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageHeader, Panel, SelectBox, EmptyState } from "@/components/app/ui";
import { FieldInput } from "@/components/app/FieldInput";
import { DocPreview } from "@/components/app/DocPreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { downloadFromStorage, fetchTemplateFields, logActivity, meQuery, saveGeneratedDocument } from "@/lib/data";
import { downloadBlob, fillTemplate, missingRequired, safeFileName } from "@/lib/generate";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/generate")({
  head: () => pageHead("Document Generator", "Fill in template fields and generate DOCX or PDF documents."),
  component: Generate,
});

function Generate() {
  const qc = useQueryClient();
  const { data: me } = useQuery(meQuery);
  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates", "active"],
    queryFn: async () => (await supabase.from("templates").select("id,name,file_type,storage_path").eq("status", "active").order("name")).data ?? [],
  });
  const [templateId, setTemplateId] = useState("");
  const template = templates?.find((t) => t.id === templateId);
  const { data: bundle } = useQuery({
    queryKey: ["template-bundle", templateId, template?.storage_path],
    enabled: !!template,
    queryFn: async () => {
      const [fields, file] = await Promise.all([fetchTemplateFields(template!.id), downloadFromStorage("templates", template!.storage_path)]);
      return { fields, buffer: await file.arrayBuffer() };
    },
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Blob | null>(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setValues({}); setPreview(null); setTried(false); }, [templateId]);

  useEffect(() => {
    if (!bundle || !template) return;
    const t = setTimeout(async () => {
      try { setPreview(await fillTemplate(template.file_type, bundle.buffer, bundle.fields, values)); }
      catch (e) { console.error(e); }
    }, 600);
    return () => clearTimeout(t);
  }, [bundle, values, template]);

  const missing = bundle ? missingRequired(bundle.fields, values) : [];

  async function generate() {
    if (!bundle || !template || !me) return;
    setTried(true);
    if (missing.length) { toast.error(`Please fill: ${missing.join(", ")}`); return; }
    setBusy(true);
    try {
      const blob = await fillTemplate(template.file_type, bundle.buffer, bundle.fields, values);
      const firstValue = bundle.fields.map((f) => values[f.key]).find((v) => v?.trim());
      const title = `${template.name}${firstValue ? ` — ${firstValue}` : ""}`;
      const format = template.file_type as "docx" | "pdf";
      const id = await saveGeneratedDocument({ userId: me.user.id, templateId: template.id, templateName: template.name, title, format, blob, data: values });
      await logActivity("Generated document", "document", id, { title, template: template.name });
      downloadBlob(blob, `${safeFileName(title)}.${format}`);
      toast.success("Document generated and saved");
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setBusy(false); }
  }

  if (!isLoading && templates?.length === 0) {
    return (
      <>
        <PageHeader title="Document Generator" />
        <EmptyState title="No templates available" text={me?.isAdmin ? "Upload a template and activate it first." : "Ask your administrator to assign you a template."}
          action={me?.isAdmin ? <Button asChild className="mt-2"><Link to="/templates">Go to Template Manager</Link></Button> : undefined} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Document Generator" description="Choose a template, fill in its fields and download the finished document." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="1. Template & details">
          <Label htmlFor="tpl">Template</Label>
          <SelectBox id="tpl" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="mb-6 mt-2">
            <option value="">Select a template…</option>
            {templates?.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.file_type.toUpperCase()})</option>)}
          </SelectBox>
          {template && !bundle && <p className="text-sm text-muted-foreground">Loading template…</p>}
          {bundle && bundle.fields.length === 0 && <p className="text-sm text-muted-foreground">This template has no confirmed fields yet.</p>}
          {bundle && (
            <div className="grid gap-4 sm:grid-cols-2">
              {bundle.fields.map((f) => (
                <FieldInput key={f.key} field={f} value={values[f.key] ?? ""} invalid={tried && missing.includes(f.label)}
                  onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
              ))}
            </div>
          )}
          {bundle && (
            <div className="mt-6">
              <Button onClick={generate} disabled={busy}><Download /> {busy ? "Generating…" : `Generate ${template!.file_type.toUpperCase()}`}</Button>
              <p className="mt-2 text-xs text-muted-foreground">Output keeps the original {template!.file_type.toUpperCase()} format. Converting Word templates to PDF is not available yet.</p>
            </div>
          )}
        </Panel>
        <Panel title="2. Live preview">
          <DocPreview blob={preview} fileType={template?.file_type ?? "docx"} />
        </Panel>
      </div>
    </>
  );
}
