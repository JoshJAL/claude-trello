import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account, userSettings } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const Route = createFileRoute("/api/settings/status")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [trelloAccount] = await db
          .select({ id: account.id })
          .from(account)
          .where(
            and(
              eq(account.userId, session.user.id),
              eq(account.providerId, "trello"),
            ),
          )
          .limit(1);

        const [settings] = await db
          .select({
            encryptedAnthropicApiKey: userSettings.encryptedAnthropicApiKey,
          })
          .from(userSettings)
          .where(eq(userSettings.userId, session.user.id))
          .limit(1);

        return Response.json({
          trelloLinked: !!trelloAccount,
          hasApiKey: !!settings?.encryptedAnthropicApiKey,
        });
      },
    },
  },
});
