import { createFileRoute } from "@tanstack/react-router";
import { randomUUID } from "crypto";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { providerKeys, userSettings } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt } from "#/lib/encrypt";
import { AI_PROVIDERS } from "#/lib/providers/types";
import type { AiProviderId } from "#/lib/providers/types";

const VALID_PROVIDER_IDS: AiProviderId[] = ["claude", "openai", "groq"];

export const Route = createFileRoute("/api/settings/apikey")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const apiKey = body.apiKey as string;
        const providerId = (body.providerId as AiProviderId) ?? "claude";

        if (!VALID_PROVIDER_IDS.includes(providerId)) {
          return Response.json(
            { error: `Invalid provider: ${providerId}` },
            { status: 400 },
          );
        }

        if (!apiKey) {
          return Response.json(
            { error: "API key is required" },
            { status: 400 },
          );
        }

        const provider = AI_PROVIDERS[providerId];
        if (!provider.keyPattern.test(apiKey)) {
          return Response.json(
            {
              error: `Invalid API key format. ${provider.label} keys must start with "${provider.keyPrefix}"`,
            },
            { status: 400 },
          );
        }

        const encrypted = encrypt(apiKey);
        const now = new Date();

        // Upsert into provider_keys table
        const [existing] = await db
          .select({ id: providerKeys.id })
          .from(providerKeys)
          .where(
            and(
              eq(providerKeys.userId, session.user.id),
              eq(providerKeys.providerId, providerId),
            ),
          )
          .limit(1);

        if (existing) {
          await db
            .update(providerKeys)
            .set({ encryptedApiKey: encrypted, updatedAt: now })
            .where(eq(providerKeys.id, existing.id));
        } else {
          await db.insert(providerKeys).values({
            id: randomUUID(),
            userId: session.user.id,
            providerId,
            encryptedApiKey: encrypted,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Also keep legacy userSettings in sync for Claude (backward compat + fallback)
        if (providerId === "claude") {
          await db
            .insert(userSettings)
            .values({
              userId: session.user.id,
              encryptedAnthropicApiKey: encrypted,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: userSettings.userId,
              set: {
                encryptedAnthropicApiKey: encrypted,
                updatedAt: now,
              },
            });
        }

        return Response.json({ success: true });
      },

      DELETE: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const providerId =
          (url.searchParams.get("providerId") as AiProviderId) ?? "claude";

        if (!VALID_PROVIDER_IDS.includes(providerId)) {
          return Response.json(
            { error: `Invalid provider: ${providerId}` },
            { status: 400 },
          );
        }

        await db
          .delete(providerKeys)
          .where(
            and(
              eq(providerKeys.userId, session.user.id),
              eq(providerKeys.providerId, providerId),
            ),
          );

        // Also clear legacy userSettings for Claude
        if (providerId === "claude") {
          await db
            .update(userSettings)
            .set({
              encryptedAnthropicApiKey: null,
              updatedAt: new Date(),
            })
            .where(eq(userSettings.userId, session.user.id));
        }

        return Response.json({ success: true });
      },
    },
  },
});
