import { createFileRoute, Link } from "@tanstack/react-router";
import { FileStack, FileCheck2, CalendarCheck, Users, FilePlus2, Upload, Layers } from "lucide-react";
import { PageHeader, Panel, BackendNotice, DataTable, StatusPill } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { sampleDocuments, sampleTemplates, sampleStaff } from "@/lib/sample-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AY-LEE Document Generator" },
      { name: "description", content: "Overview of templates, generated documents and staff at AY-LEE." },
      { property: "og:title", content: "Dashboard — AY-LEE Document Generator" },
      { property: "og:description", content: "Overview of templates, generated documents and staff at AY-LEE." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const stats = [
    { label: "Total templates", value: sampleTemplates.length, icon: FileStack },
    { label: "Generated documents", value: 1284, icon: FileCheck2 },
    { label: "Generated today", value: 2, icon: CalendarCheck },
    { label: "Staff accounts", value: sampleStaff.length, icon: Users },
  ];
  return (
    <>
      <PageHeader
        title="Welcome back"
        description="Here's what's happening with your documents."
        actions={
          <Button asChild><Link to="/generate"><FilePlus2 /> New document</Link></Button>
        }
      />
      <BackendNotice>figures below are sample data until the database is connected.</BackendNotice>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-3 font-display text-3xl font-semibold">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Recently generated" className="lg:col-span-2" action={<Link to="/documents" className="text-sm font-medium text-primary">View all</Link>}>
          <DataTable
            head={["Document", "Format", "By", "Created"]}
            rows={sampleDocuments.slice(0, 4).map((d) => [
              <span className="font-medium">{d.title}</span>, d.format, d.by, <span className="text-muted-foreground">{d.created}</span>,
            ])}
          />
        </Panel>
        <Panel title="Quick actions">
          <div className="grid gap-2">
            {[
              { to: "/generate" as const, label: "Generate a document", icon: FilePlus2 },
              { to: "/templates" as const, label: "Upload a template", icon: Upload },
              { to: "/bulk" as const, label: "Bulk generate from Excel", icon: Layers },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:bg-primary-soft">
                <Icon className="h-4 w-4 text-primary" /> {label}
              </Link>
            ))}
          </div>
          <h3 className="mb-3 mt-6 text-sm font-semibold">Recently added templates</h3>
          <ul className="space-y-3">
            {sampleTemplates.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <span>{t.name}</span><StatusPill value={t.status} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
