import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getProjects } from "#/lib/gitlab/client";

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

        try {
          const projects = await getProjects(gitlabAccount.accessToken);
          return Response.json(projects);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          // Token may be expired — return specific error so frontend can prompt re-auth
          if (message.includes("401")) {
            return Response.json(
              { error: "GitLab token expired. Please reconnect GitLab in Settings." },
              { status: 401 },
            );
          }
          return Response.json(
            { error: message },
            { status: 502 },
          );
        }
      },
    },
  },
});
