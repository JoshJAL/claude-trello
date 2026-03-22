import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { userSettings } from "#/lib/db/schema";
import { eq } from "drizzle-orm";
import { UPDATES, getUnseenUpdates } from "#/lib/updates";

export const Route = createFileRoute("/api/updates/")({
  server: {
    handlers: {
      // GET /api/updates — returns all updates + unseen count for the user
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's last seen timestamp
        const [settings] = await db
          .select({ lastSeenUpdateAt: userSettings.lastSeenUpdateAt })
          .from(userSettings)
          .where(eq(userSettings.userId, session.user.id))
          .limit(1);

        const lastSeenAt = settings?.lastSeenUpdateAt ?? null;
        const unseen = getUnseenUpdates(lastSeenAt);

        return Response.json({
          updates: UPDATES,
          unseenCount: unseen.length,
          lastSeenAt: lastSeenAt?.toISOString() ?? null,
        });
      },
    },
  },
});
