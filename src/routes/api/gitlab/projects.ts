import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { getProjects } from "#/lib/gitlab/client";
import { getValidGitLabToken } from "#/lib/gitlab/token";

export const Route = createFileRoute("/api/gitlab/projects")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
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

        try {
          const projects = await getProjects(token);
          return Response.json(projects);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 502 },
          );
        }
      },
    },
  },
});
