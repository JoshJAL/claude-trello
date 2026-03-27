import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { user } from "#/lib/db/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/account/delete")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Delete the user — all related data is cascade-deleted by foreign keys
        // (session, account, userSettings, providerKeys, agentSessions,
        //  sessionEvents, registeredWebhooks)
        await db.delete(user).where(eq(user.id, session.user.id));

        return Response.json({ success: true });
      },
    },
  },
});
