import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account, providerKeys, userSettings } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { AiProviderId } from "#/lib/providers/types";

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

        const [githubAccount] = await db
          .select({ id: account.id })
          .from(account)
          .where(
            and(
              eq(account.userId, session.user.id),
              eq(account.providerId, "github"),
            ),
          )
          .limit(1);

        const [gitlabAccount] = await db
          .select({ id: account.id })
          .from(account)
          .where(
            and(
              eq(account.userId, session.user.id),
              eq(account.providerId, "gitlab"),
            ),
          )
          .limit(1);

        const [googleAccount] = await db
          .select({ id: account.id })
          .from(account)
          .where(
            and(
              eq(account.userId, session.user.id),
              eq(account.providerId, "google"),
            ),
          )
          .limit(1);

        const [onedriveAccount] = await db
          .select({ id: account.id })
          .from(account)
          .where(
            and(
              eq(account.userId, session.user.id),
              eq(account.providerId, "onedrive"),
            ),
          )
          .limit(1);

        // Check provider_keys table for configured providers
        const configuredProviders: AiProviderId[] = [];

        const keys = await db
          .select({ providerId: providerKeys.providerId })
          .from(providerKeys)
          .where(eq(providerKeys.userId, session.user.id));

        for (const k of keys) {
          configuredProviders.push(k.providerId as AiProviderId);
        }

        // Fallback: if claude not in provider_keys but legacy userSettings has a key,
        // report claude as configured (pre-migration users)
        if (!configuredProviders.includes("claude")) {
          const [settings] = await db
            .select({
              encryptedAnthropicApiKey: userSettings.encryptedAnthropicApiKey,
            })
            .from(userSettings)
            .where(eq(userSettings.userId, session.user.id))
            .limit(1);

          if (settings?.encryptedAnthropicApiKey) {
            configuredProviders.push("claude");
          }
        }

        return Response.json({
          trelloLinked: !!trelloAccount,
          githubLinked: !!githubAccount,
          gitlabLinked: !!gitlabAccount,
          googleDriveLinked: !!googleAccount,
          oneDriveLinked: !!onedriveAccount,
          configuredProviders,
          hasApiKey: configuredProviders.length > 0,
        });
      },
    },
  },
});
