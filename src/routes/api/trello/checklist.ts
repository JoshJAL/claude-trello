import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateCheckItem } from "#/lib/trello";

export const Route = createFileRoute("/api/trello/checklist")({
  server: {
    handlers: {
      PATCH: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { cardId, checkItemId, state } = body as {
          cardId: string;
          checkItemId: string;
          state: "complete" | "incomplete";
        };

        if (!cardId || !checkItemId || !state) {
          return Response.json(
            { error: "cardId, checkItemId, and state are required" },
            { status: 400 },
          );
        }

        const [trelloAccount] = await db
          .select({ accessToken: account.accessToken })
          .from(account)
          .where(
            and(
              eq(account.userId, session.user.id),
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

        await updateCheckItem(
          trelloAccount.accessToken,
          cardId,
          checkItemId,
          state,
        );
        return Response.json({ success: true });
      },
    },
  },
});
