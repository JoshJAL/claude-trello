import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getIssue, updateIssueBody } from "#/lib/github/client";
import { toggleTaskItem } from "#/lib/github/parser";

export const Route = createFileRoute("/api/github/task")({
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
        const { owner, repo, issueNumber, taskIndex, checked } = body as {
          owner: string;
          repo: string;
          issueNumber: number;
          taskIndex: number;
          checked: boolean;
        };

        if (!owner || !repo || issueNumber == null || taskIndex == null) {
          return Response.json(
            { error: "owner, repo, issueNumber, and taskIndex are required" },
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

        const issue = await getIssue(
          githubAccount.accessToken,
          owner,
          repo,
          issueNumber,
        );

        if (!issue.body) {
          return Response.json(
            { error: "Issue has no body" },
            { status: 400 },
          );
        }

        const updatedBody = toggleTaskItem(
          issue.body,
          taskIndex,
          checked ?? true,
        );
        await updateIssueBody(
          githubAccount.accessToken,
          owner,
          repo,
          issueNumber,
          updatedBody,
        );

        return Response.json({ success: true });
      },
    },
  },
});
