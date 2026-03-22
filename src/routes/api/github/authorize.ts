import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/github/authorize")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clientId = process.env.GITHUB_CLIENT_ID;
        if (!clientId) {
          return Response.json(
            { error: "GitHub OAuth not configured" },
            { status: 500 },
          );
        }

        const baseUrl =
          process.env.BASE_URL || new URL(request.url).origin;
        const redirectUri = `${baseUrl}/api/github/callback`;
        const authorizeUrl =
          `https://github.com/login/oauth/authorize?` +
          `client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${encodeURIComponent("repo read:user")}`;

        return Response.json({ url: authorizeUrl });
      },
    },
  },
});
