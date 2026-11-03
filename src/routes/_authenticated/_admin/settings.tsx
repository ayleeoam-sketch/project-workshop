import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, BackendNotice } from "@/components/app/ui";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_admin/settings")({
  head: () => pageHead("Settings", "Settings for AY-LEE administrators."),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Settings" />
      <BackendNotice>this admin page is not built yet. Its database security rules are in place, but the screen is still to come.</BackendNotice>
    </>
  );
}
