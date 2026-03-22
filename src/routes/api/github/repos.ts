import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getRepos } from "#/lib/github/client";

export const Route = createFileRoute("/api/github/repos")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [githubAccount] = await db
          .select({ accessToken: account.accessToken })
          .from(account)
          .where(
            and(
              eq(account.userId, session.user.id),
              eq(account.providerId, "github"),
            ),
          )
          .limit(1);

        if (!githubAccount?.accessToken) {
          return Response.json(
            { error: "GitHub not connected" },
            { status: 400 },
          );
        }

        const repos = await getRepos(githubAccount.accessToken);
        return Response.json(repos);
      },
    },
  },
});
