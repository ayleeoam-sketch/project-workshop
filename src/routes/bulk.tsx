import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet } from "lucide-react";
import { PageHeader, Panel, BackendNotice } from "@/components/app/ui";

export const Route = createFileRoute("/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk Generator — AY-LEE" },
      { name: "description", content: "Generate many documents at once from Excel or CSV." },
      { property: "og:title", content: "Bulk Generator — AY-LEE" },
      { property: "og:description", content: "Generate many documents at once from Excel or CSV." },
    ],
  }),
  component: Bulk,
});

const steps = ["Choose template", "Upload Excel / CSV", "Match columns", "Preview records", "Generate & download ZIP"];

function Bulk() {
  return (
    <>
      <PageHeader title="Bulk Document Generator" description="Turn a spreadsheet into many finished documents." />
      <BackendNotice>spreadsheet upload and batch generation arrive in the backend stage.</BackendNotice>
      <Panel>
        <ol className="grid gap-3 sm:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s} className="rounded-xl border p-4">
              <span className="font-display text-2xl font-semibold text-primary">{i + 1}</span>
              <p className="mt-1 text-sm font-medium">{s}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed py-12 text-center">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          <p className="font-semibold">Drop an .xlsx or .csv file</p>
          <p className="text-sm text-muted-foreground">Each row becomes one document.</p>
        </div>
      </Panel>
    </>
  );
}
