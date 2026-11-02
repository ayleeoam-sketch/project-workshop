import { createFileRoute } from "@tanstack/react-router";
import { Upload, Sparkles } from "lucide-react";
import { PageHeader, Panel, BackendNotice, DataTable, StatusPill } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { sampleTemplates } from "@/lib/sample-data";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Template Manager — AY-LEE" },
      { name: "description", content: "Upload DOCX and PDF templates and configure their fields." },
      { property: "og:title", content: "Template Manager — AY-LEE" },
      { property: "og:description", content: "Upload DOCX and PDF templates and configure their fields." },
    ],
  }),
  component: Templates,
});

function Templates() {
  return (
    <>
      <PageHeader title="Template Manager" description="Upload, configure, version and archive document templates." actions={<Button disabled><Upload /> Upload template</Button>} />
      <BackendNotice>uploads, field detection, versioning and archiving need the backend and are not active yet.</BackendNotice>
      <Panel className="mb-6">
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary"><Sparkles className="h-5 w-5" /></span>
          <p className="font-semibold">Drop a DOCX or PDF template here</p>
          <p className="max-w-md text-sm text-muted-foreground">We'll read the text, suggest fields like full name, matric number or amount, and let you review every one before saving. Nothing changes without your approval.</p>
        </div>
      </Panel>
      <Panel title="All templates">
        <DataTable
          head={["Name", "Type", "Fields", "Version", "Status", "Updated"]}
          rows={sampleTemplates.map((t) => [<span className="font-medium">{t.name}</span>, t.type, t.fields, `v${t.version}`, <StatusPill value={t.status} />, t.updated])}
        />
      </Panel>
    </>
  );
}
