import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCards, getLists } from "#/lib/trello";

export const Route = createFileRoute("/api/trello/cards")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const boardId = url.searchParams.get("boardId");
        if (!boardId) {
          return Response.json(
            { error: "boardId is required" },
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

        try {
          const [cards, lists] = await Promise.all([
            getCards(trelloAccount.accessToken, boardId),
            getLists(trelloAccount.accessToken, boardId),
          ]);

          const doneList = lists.find(
            (l) => l.name.toLowerCase() === "done",
          );

          return Response.json({
            cards,
            lists,
            doneListId: doneList?.id ?? null,
          });
        } catch {
          return Response.json(
            { error: "Failed to fetch cards from Trello" },
            { status: 502 },
          );
        }
      },
    },
  },
});
