import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { meQuery } from "@/lib/data";

// UI gate only — the database security rules are the real protection.
export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me?.isAdmin) throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});
