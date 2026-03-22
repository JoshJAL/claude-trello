import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { exchangeCodeForToken, verifyToken } from "#/lib/google/client";

export const Route = createFileRoute("/api/google/connect")({
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
        const code = body.code as string;

        if (!code) {
          return Response.json(
            { error: "Authorization code is required" },
            { status: 400 },
          );
        }

        let tokenSet;
        try {
          tokenSet = await exchangeCodeForToken(code);
        } catch (err) {
          return Response.json(
            {
              error:
                err instanceof Error
                  ? err.message
                  : "Failed to exchange code for token",
            },
            { status: 400 },
          );
        }

        let googleUser: { id: string; email: string };
        try {
          googleUser = await verifyToken(tokenSet.accessToken);
        } catch {
          return Response.json(
            { error: "Invalid Google token" },
            { status: 400 },
          );
        }

        const now = new Date();
        const expiresAt = tokenSet.expiresIn
          ? new Date(Date.now() + tokenSet.expiresIn * 1000)
          : null;

        // Upsert: delete existing google account row, then insert
        await db
          .delete(account)
          .where(
            and(
              eq(account.userId, session.user.id),
              eq(account.providerId, "google"),
            ),
          );

        await db.insert(account).values({
          id: randomUUID(),
          userId: session.user.id,
          accountId: googleUser.id,
          providerId: "google",
          accessToken: tokenSet.accessToken,
          refreshToken: tokenSet.refreshToken,
          accessTokenExpiresAt: expiresAt,
          createdAt: now,
          updatedAt: now,
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
          .delete(account)
          .where(
            and(
              eq(account.userId, session.user.id),
              eq(account.providerId, "google"),
            ),
          );

        return Response.json({ success: true });
      },
    },
  },
});
