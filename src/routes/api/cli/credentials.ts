import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account, providerKeys, userSettings } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "#/lib/encrypt";
import type { AiProviderId } from "#/lib/providers/types";

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
        const url = new URL(request.url);
        const providerId =
          (url.searchParams.get("providerId") as AiProviderId) ?? "claude";
        const source = url.searchParams.get("source") ?? "trello";

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

        // Trello token is required only for trello source; for others it's optional
        if (source === "trello" && !trelloAccount?.accessToken) {
          return Response.json(
            { error: "Trello not connected" },
            { status: 400 },
          );
        }

        // Look up provider key from provider_keys table
        let encryptedKey: string | null = null;

        const [providerKey] = await db
          .select({ encryptedApiKey: providerKeys.encryptedApiKey })
          .from(providerKeys)
          .where(
            and(
              eq(providerKeys.userId, userId),
              eq(providerKeys.providerId, providerId),
            ),
          )
          .limit(1);

        if (providerKey) {
          encryptedKey = providerKey.encryptedApiKey;
        }

        // Fallback to legacy userSettings for Claude
        if (!encryptedKey && providerId === "claude") {
          const [settings] = await db
            .select({
              encryptedAnthropicApiKey: userSettings.encryptedAnthropicApiKey,
            })
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);
          encryptedKey = settings?.encryptedAnthropicApiKey ?? null;
        }

        if (!encryptedKey) {
          return Response.json(
            { error: `${providerId} API key not configured` },
            { status: 400 },
          );
        }

        let apiKey: string;
        try {
          apiKey = decrypt(encryptedKey);
        } catch {
          return Response.json(
            { error: "API key is corrupted. Please re-enter it in Settings." },
            { status: 400 },
          );
        }

        // Optionally fetch GitHub token
        let githubToken: string | undefined;
        if (source === "github") {
          const [githubAccount] = await db
            .select({ accessToken: account.accessToken })
            .from(account)
            .where(
              and(
                eq(account.userId, userId),
                eq(account.providerId, "github"),
              ),
            )
            .limit(1);
          githubToken = githubAccount?.accessToken ?? undefined;
          if (!githubToken) {
            return Response.json(
              { error: "GitHub not connected" },
              { status: 400 },
            );
          }
        }

        // Optionally fetch GitLab token
        let gitlabToken: string | undefined;
        if (source === "gitlab") {
          const [gitlabAccount] = await db
            .select({ accessToken: account.accessToken })
            .from(account)
            .where(
              and(
                eq(account.userId, userId),
                eq(account.providerId, "gitlab"),
              ),
            )
            .limit(1);
          gitlabToken = gitlabAccount?.accessToken ?? undefined;
          if (!gitlabToken) {
            return Response.json(
              { error: "GitLab not connected" },
              { status: 400 },
            );
          }
        }

        return Response.json({
          trelloApiKey: process.env.TRELLO_API_KEY!,
          trelloToken: trelloAccount?.accessToken ?? "",
          anthropicApiKey: apiKey,
          providerId,
          ...(githubToken ? { githubToken } : {}),
          ...(gitlabToken ? { gitlabToken } : {}),
        });
      },
    },
  },
});
