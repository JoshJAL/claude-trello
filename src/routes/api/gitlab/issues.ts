import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { getIssues } from "#/lib/gitlab/client";
import { getValidGitLabToken } from "#/lib/gitlab/token";
import { parseTaskList } from "#/lib/gitlab/parser";

export const Route = createFileRoute("/api/gitlab/issues")({
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
        const projectId = url.searchParams.get("projectId");

        if (!projectId) {
          return Response.json(
            { error: "projectId query param is required" },
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

        const issues = await getIssues(token, Number(projectId));

        const issuesWithTasks = issues.map((issue) => ({
          ...issue,
          tasks: parseTaskList(issue.description),
        }));

        return Response.json(issuesWithTasks);
      },
    },
  },
});
