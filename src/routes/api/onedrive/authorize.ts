import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/onedrive/authorize")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clientId = process.env.ONEDRIVE_CLIENT_ID;
        if (!clientId) {
          return Response.json(
            { error: "OneDrive OAuth not configured" },
            { status: 500 },
          );
        }

        const tenant = process.env.ONEDRIVE_TENANT_ID || "consumers";
        const baseUrl =
          process.env.BASE_URL || new URL(request.url).origin;
        const redirectUri = `${baseUrl}/api/onedrive/callback`;
        const authorizeUrl =
          `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?` +
          `client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent("Files.ReadWrite User.Read offline_access")}` +
          `&prompt=consent`;

        return Response.json({ url: authorizeUrl });
      },
    },
  },
});
