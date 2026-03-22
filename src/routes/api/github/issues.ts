import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getIssues } from "#/lib/github/client";
import { parseTaskList } from "#/lib/github/parser";

export const Route = createFileRoute("/api/github/issues")({
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
        const owner = url.searchParams.get("owner");
        const repo = url.searchParams.get("repo");

        if (!owner || !repo) {
          return Response.json(
            { error: "owner and repo query params are required" },
            { status: 400 },
          );
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

        const issues = await getIssues(githubAccount.accessToken, owner, repo);

        // Parse task lists from issue bodies
        const issuesWithTasks = issues.map((issue) => ({
          ...issue,
          tasks: parseTaskList(issue.body),
        }));

        return Response.json(issuesWithTasks);
      },
    },
  },
});
