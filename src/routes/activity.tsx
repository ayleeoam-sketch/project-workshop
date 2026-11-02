import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, BackendNotice } from "@/components/app/ui";
import { sampleActivity } from "@/lib/sample-data";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity Logs — AY-LEE" },
      { name: "description", content: "Audit trail of important actions across the platform." },
      { property: "og:title", content: "Activity Logs — AY-LEE" },
      { property: "og:description", content: "Audit trail of important actions across the platform." },
    ],
  }),
  component: Activity,
});

function Activity() {
  return (
    <>
      <PageHeader title="Activity Logs" description="A record of uploads, generations and admin actions." />
      <BackendNotice>entries are samples; real logging starts with the backend.</BackendNotice>
      <Panel>
        <ol className="relative space-y-6 border-l pl-6">
          {sampleActivity.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm"><span className="font-semibold">{a.actor}</span> {a.action.toLowerCase()} <span className="font-medium">{a.target}</span></p>
              <p className="text-xs text-muted-foreground">{a.at}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </>
  );
}
