import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account, userSettings } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "#/lib/encrypt";

export const Route = createFileRoute("/api/cli/credentials")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        const [trelloAccount] = await db
          .select({ accessToken: account.accessToken })
          .from(account)
          .where(
            and(
              eq(account.userId, userId),
              eq(account.providerId, "trello"),
            ),
          )
          .limit(1);

        if (!trelloAccount?.accessToken) {
          return Response.json(
            { error: "Trello not connected" },
            { status: 400 },
          );
        }

        const [settings] = await db
          .select({
            encryptedAnthropicApiKey: userSettings.encryptedAnthropicApiKey,
          })
          .from(userSettings)
          .where(eq(userSettings.userId, userId))
          .limit(1);

        if (!settings?.encryptedAnthropicApiKey) {
          return Response.json(
            { error: "Anthropic API key not configured" },
            { status: 400 },
          );
        }

        let anthropicApiKey: string;
        try {
          anthropicApiKey = decrypt(settings.encryptedAnthropicApiKey);
        } catch {
          return Response.json(
            { error: "API key is corrupted. Please re-enter it in Settings." },
            { status: 400 },
          );
        }

        return Response.json({
          trelloApiKey: process.env.TRELLO_API_KEY!,
          trelloToken: trelloAccount.accessToken,
          anthropicApiKey,
        });
      },
    },
  },
});
