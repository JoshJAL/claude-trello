import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/gitlab/authorize")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clientId = process.env.GITLAB_CLIENT_ID;
        if (!clientId) {
          return Response.json(
            { error: "GitLab OAuth not configured" },
            { status: 500 },
          );
        }

        const baseUrl =
          process.env.BASE_URL || new URL(request.url).origin;
        const redirectUri = `${baseUrl}/api/gitlab/callback`;
        const authorizeUrl =
          `https://gitlab.com/oauth/authorize?` +
          `client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent("api")}`;

        return Response.json({ url: authorizeUrl });
      },
    },
  },
});
