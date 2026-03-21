import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export const Route = createFileRoute("/api/trello/connect")({
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
        const token = body.token as string;

        if (!token) {
          return Response.json(
            { error: "Token is required" },
            { status: 400 },
          );
        }

        // Verify the token works by calling Trello API
        const verifyRes = await fetch(
          `https://api.trello.com/1/members/me?key=${process.env.TRELLO_API_KEY}&token=${token}`,
        );
        if (!verifyRes.ok) {
          return Response.json(
            { error: "Invalid Trello token" },
            { status: 400 },
          );
        }

        const trelloUser = (await verifyRes.json()) as { id: string };
        const now = new Date();

        // Upsert: delete existing trello account row, then insert
        await db
          .delete(account)
          .where(
            and(
              eq(account.userId, session.user.id),
              eq(account.providerId, "trello"),
            ),
          );

        await db.insert(account).values({
          id: randomUUID(),
          userId: session.user.id,
          accountId: trelloUser.id,
          providerId: "trello",
          accessToken: token,
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
              eq(account.providerId, "trello"),
            ),
          );

        return Response.json({ success: true });
      },
    },
  },
});
