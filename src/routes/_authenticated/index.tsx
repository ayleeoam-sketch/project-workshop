import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileStack, FileCheck2, CalendarCheck, Users, FilePlus2, Upload, Layers } from "lucide-react";
import { PageHeader, Panel, DataTable, StatusPill, EmptyState } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, fmtDate } from "@/lib/data";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/")({
  head: () => pageHead("Dashboard", "Overview of templates, generated documents and staff at AY-LEE."),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useQuery(meQuery);
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [t, d, dt, s, recentDocs, recentTpl] = await Promise.all([
        supabase.from("templates").select("id", { count: "exact", head: true }),
        supabase.from("generated_documents").select("id", { count: "exact", head: true }),
        supabase.from("generated_documents").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("generated_documents").select("id,title,format,created_at,template_name").order("created_at", { ascending: false }).limit(5),
        supabase.from("templates").select("id,name,status,created_at").order("created_at", { ascending: false }).limit(4),
      ]);
      return { templates: t.count ?? 0, docs: d.count ?? 0, today: dt.count ?? 0, staff: s.count ?? 0, recentDocs: recentDocs.data ?? [], recentTpl: recentTpl.data ?? [] };
    },
  });

  const stats = [
    { label: me?.isAdmin ? "Total templates" : "My templates", value: data?.templates, icon: FileStack },
    { label: me?.isAdmin ? "Generated documents" : "My documents", value: data?.docs, icon: FileCheck2 },
    { label: "Generated today", value: data?.today, icon: CalendarCheck },
    ...(me?.isAdmin ? [{ label: "Staff accounts", value: data?.staff, icon: Users }] : []),
  ];
  const actions = [
    { to: "/generate" as const, label: "Generate a document", icon: FilePlus2 },
    ...(me?.isAdmin ? [{ to: "/templates" as const, label: "Upload a template", icon: Upload }] : []),
    { to: "/bulk" as const, label: "Bulk generate from Excel", icon: Layers },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome${me?.profile?.full_name ? `, ${me.profile.full_name.split(" ")[0]}` : ""}`}
        description="Here's what's happening with your documents."
        actions={<Button asChild><Link to="/generate"><FilePlus2 /> New document</Link></Button>}
      />
      <div className={`grid gap-4 sm:grid-cols-2 ${me?.isAdmin ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-3 font-display text-3xl font-semibold">{value === undefined ? "–" : value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Recently generated" className="lg:col-span-2" action={<Link to="/documents" className="text-sm font-medium text-primary">View all</Link>}>
          {data && data.recentDocs.length === 0 ? (
            <EmptyState title="No documents yet" text="Documents you generate will appear here." />
          ) : (
            <DataTable
              head={["Document", "Template", "Format", "Created"]}
              rows={(data?.recentDocs ?? []).map((d) => [
                <span className="font-medium">{d.title}</span>, d.template_name, d.format.toUpperCase(), <span className="text-muted-foreground">{fmtDate(d.created_at)}</span>,
              ])}
            />
          )}
        </Panel>
        <Panel title="Quick actions">
          <div className="grid gap-2">
            {actions.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:bg-primary-soft">
                <Icon className="h-4 w-4 text-primary" /> {label}
              </Link>
            ))}
          </div>
          <h3 className="mb-3 mt-6 text-sm font-semibold">Recently added templates</h3>
          {data && data.recentTpl.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          ) : (
            <ul className="space-y-3">
              {(data?.recentTpl ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{t.name}</span><StatusPill value={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
