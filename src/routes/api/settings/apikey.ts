import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { userSettings } from "#/lib/db/schema";
import { eq } from "drizzle-orm";
import { encrypt } from "#/lib/encrypt";

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

        if (!apiKey || !apiKey.startsWith("sk-ant-api03-")) {
          return Response.json(
            { error: "Invalid API key format" },
            { status: 400 },
          );
        }

        const encrypted = encrypt(apiKey);
        const now = new Date();

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

        return Response.json({ success: true });
      },

      DELETE: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        await db
          .update(userSettings)
          .set({
            encryptedAnthropicApiKey: null,
            updatedAt: new Date(),
          })
          .where(eq(userSettings.userId, session.user.id));

        return Response.json({ success: true });
      },
    },
  },
});
