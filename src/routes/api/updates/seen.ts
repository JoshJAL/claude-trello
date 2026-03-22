import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { userSettings } from "#/lib/db/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/updates/seen")({
  server: {
    handlers: {
      // POST /api/updates/seen — mark all updates as seen
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const userId = session.user.id;

        // Upsert: update if exists, insert if not
        const [existing] = await db
          .select({ userId: userSettings.userId })
          .from(userSettings)
          .where(eq(userSettings.userId, userId))
          .limit(1);

        if (existing) {
          await db
            .update(userSettings)
            .set({ lastSeenUpdateAt: now, updatedAt: now })
            .where(eq(userSettings.userId, userId));
        } else {
          await db.insert(userSettings).values({
            userId,
            lastSeenUpdateAt: now,
            createdAt: now,
            updatedAt: now,
          });
        }

        return Response.json({ success: true });
      },
    },
  },
});
