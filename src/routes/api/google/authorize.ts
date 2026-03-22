import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/google/authorize")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
          return Response.json(
            { error: "Google OAuth not configured" },
            { status: 500 },
          );
        }

        const baseUrl =
          process.env.BASE_URL || new URL(request.url).origin;
        const redirectUri = `${baseUrl}/api/google/callback`;
        const authorizeUrl =
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent("https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/documents openid email")}` +
          `&access_type=offline` +
          `&prompt=consent`;

        return Response.json({ url: authorizeUrl });
      },
    },
  },
});
