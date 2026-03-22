import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { exchangeCodeForToken, verifyToken } from "#/lib/gitlab/client";

export const Route = createFileRoute("/api/gitlab/connect")({
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

        let accessToken: string;
        try {
          accessToken = await exchangeCodeForToken(code);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to exchange code for token";
          console.error("[GitLab connect] Token exchange failed:", message);
          console.error("[GitLab connect] BASE_URL:", process.env.BASE_URL);
          console.error("[GitLab connect] GITLAB_CLIENT_ID set:", !!process.env.GITLAB_CLIENT_ID);
          console.error("[GitLab connect] GITLAB_CLIENT_SECRET set:", !!process.env.GITLAB_CLIENT_SECRET);
          return Response.json(
            { error: message },
            { status: 400 },
          );
        }

        let gitlabUser: { id: number; username: string };
        try {
          gitlabUser = await verifyToken(accessToken);
        } catch {
          return Response.json(
            { error: "Invalid GitLab token" },
            { status: 400 },
          );
        }

        const now = new Date();

        // Upsert: delete existing gitlab account row, then insert
        await db
          .delete(account)
          .where(
            and(
              eq(account.userId, session.user.id),
              eq(account.providerId, "gitlab"),
            ),
          );

        await db.insert(account).values({
          id: randomUUID(),
          userId: session.user.id,
          accountId: String(gitlabUser.id),
          providerId: "gitlab",
          accessToken,
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
              eq(account.providerId, "gitlab"),
            ),
          );

        return Response.json({ success: true });
      },
    },
  },
});
