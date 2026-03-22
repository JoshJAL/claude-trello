import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getIssue, updateIssueDescription } from "#/lib/gitlab/client";
import { toggleTaskItem } from "#/lib/gitlab/parser";

export const Route = createFileRoute("/api/gitlab/task")({
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
        const { projectId, issueIid, taskIndex, checked } = body as {
          projectId: number;
          issueIid: number;
          taskIndex: number;
          checked: boolean;
        };

        if (projectId == null || issueIid == null || taskIndex == null) {
          return Response.json(
            { error: "projectId, issueIid, and taskIndex are required" },
            { status: 400 },
          );
        }

        const [gitlabAccount] = await db
          .select({ accessToken: account.accessToken })
          .from(account)
          .where(
            and(
              eq(account.userId, session.user.id),
              eq(account.providerId, "gitlab"),
            ),
          )
          .limit(1);

        if (!gitlabAccount?.accessToken) {
          return Response.json(
            { error: "GitLab not connected" },
            { status: 400 },
          );
        }

        const issue = await getIssue(
          gitlabAccount.accessToken,
          projectId,
          issueIid,
        );

        if (!issue.description) {
          return Response.json(
            { error: "Issue has no description" },
            { status: 400 },
          );
        }

        const updatedDescription = toggleTaskItem(
          issue.description,
          taskIndex,
          checked ?? true,
        );
        await updateIssueDescription(
          gitlabAccount.accessToken,
          projectId,
          issueIid,
          updatedDescription,
        );

        return Response.json({ success: true });
      },
    },
  },
});
