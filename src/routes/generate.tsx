import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, BackendNotice } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sampleFields, sampleTemplates } from "@/lib/sample-data";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: "Document Generator — AY-LEE" },
      { name: "description", content: "Fill in template fields and generate DOCX or PDF documents." },
      { property: "og:title", content: "Document Generator — AY-LEE" },
      { property: "og:description", content: "Fill in template fields and generate DOCX or PDF documents." },
    ],
  }),
  component: Generate,
});

function Generate() {
  const active = sampleTemplates.filter((t) => t.status === "active");
  const [templateId, setTemplateId] = useState(active[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const template = active.find((t) => t.id === templateId)!;

  return (
    <>
      <PageHeader title="Document Generator" description="Choose a template, fill its fields and preview the result." />
      <BackendNotice>fields are sample configuration. Templates' real fields will load from the database, and DOCX/PDF downloads arrive in the backend stage.</BackendNotice>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="1. Template & details">
          <Label htmlFor="tpl">Template</Label>
          <select id="tpl" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="mt-2 mb-6 h-10 w-full rounded-md border bg-card px-3 text-sm">
            {active.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
          </select>
          <div className="grid gap-4 sm:grid-cols-2">
            {sampleFields.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key}>{f.label}{f.required && <span className="text-primary"> *</span>}</Label>
                <Input
                  id={f.key}
                  className="mt-1.5"
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            <Button disabled>Download DOCX</Button>
            <Button variant="outline" disabled>Download PDF</Button>
          </div>
        </Panel>
        <Panel title="2. Live preview">
          <div className="aspect-[1/1.3] rounded-xl border bg-card p-8 text-sm">
            <div className="mb-6 border-b-2 border-primary pb-3">
              <p className="font-display font-bold text-primary">AY-LEE INTEGRATED VENTURES</p>
              <p className="text-xs text-muted-foreground">{template.name}</p>
            </div>
            <div className="space-y-2">
              {sampleFields.map((f) => (
                <p key={f.key}>
                  <span className="text-muted-foreground">{f.label}: </span>
                  <span className={values[f.key] ? "font-semibold" : "rounded bg-primary-soft px-1 text-primary"}>
                    {values[f.key] || `{{${f.key}}}`}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
