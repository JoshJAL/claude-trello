import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import { PageSkeleton } from "#/components/PageSkeleton";

export const Route = createFileRoute("/updates")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  component: UpdatesLayout,
  pendingComponent: PageSkeleton,
});

function UpdatesLayout() {
  return <Outlet />;
}
