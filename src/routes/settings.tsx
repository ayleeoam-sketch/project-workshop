import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, BackendNotice } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AY-LEE" },
      { name: "description", content: "Business details and platform preferences." },
      { property: "og:title", content: "Settings — AY-LEE" },
      { property: "og:description", content: "Business details and platform preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Business details and upload limits." />
      <BackendNotice>settings can't be saved until the backend is connected.</BackendNotice>
      <Panel title="Business profile" className="max-w-2xl">
        <div className="grid gap-4">
          <div><Label htmlFor="biz">Business name</Label><Input id="biz" className="mt-1.5" defaultValue="AY-LEE INTEGRATED VENTURES" /></div>
          <div><Label htmlFor="max">Max upload size (MB)</Label><Input id="max" type="number" className="mt-1.5" defaultValue={10} /></div>
          <Button disabled className="w-fit">Save changes</Button>
        </div>
      </Panel>
    </>
  );
}
