import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { getIssue, updateIssueDescription } from "#/lib/gitlab/client";
import { getValidGitLabToken } from "#/lib/gitlab/token";
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

        let token: string;
        try {
          const t = await getValidGitLabToken(session.user.id);
          if (!t) {
            return Response.json({ error: "GitLab not connected" }, { status: 400 });
          }
          token = t;
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "GitLab token error" },
            { status: 401 },
          );
        }

        const issue = await getIssue(token, projectId, issueIid);

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
        await updateIssueDescription(token, projectId, issueIid, updatedDescription);

        return Response.json({ success: true });
      },
    },
  },
});
