import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { PageHeader, Panel, BackendNotice, DataTable, StatusPill } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { sampleStaff } from "@/lib/sample-data";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff Management — AY-LEE" },
      { name: "description", content: "Manage admin and staff accounts and permissions." },
      { property: "og:title", content: "Staff Management — AY-LEE" },
      { property: "og:description", content: "Manage admin and staff accounts and permissions." },
    ],
  }),
  component: Staff,
});

function Staff() {
  return (
    <>
      <PageHeader title="Staff Management" description="Admins have full access; staff generate documents from assigned templates." actions={<Button disabled><UserPlus /> Invite staff</Button>} />
      <BackendNotice>accounts and roles need sign-in to be set up first.</BackendNotice>
      <Panel>
        <DataTable
          head={["Name", "Email", "Role", "Status", "Documents"]}
          rows={sampleStaff.map((s) => [<span className="font-medium">{s.name}</span>, s.email, <StatusPill value={s.role} />, <StatusPill value={s.status} />, s.docs])}
        />
      </Panel>
    </>
  );
}
