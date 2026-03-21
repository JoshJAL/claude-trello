import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/trello/authorize")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const apiKey = process.env.TRELLO_API_KEY;
        if (!apiKey) {
          return Response.json(
            { error: "Trello API key not configured" },
            { status: 500 },
          );
        }

        const baseUrl =
          process.env.BASE_URL || new URL(request.url).origin;
        const returnUrl = `${baseUrl}/api/trello/callback`;
        const authorizeUrl =
          `https://trello.com/1/authorize?` +
          `expiration=never` +
          `&name=ClaudeTrelloBridge` +
          `&scope=read,write` +
          `&response_type=token` +
          `&key=${apiKey}` +
          `&callback_method=fragment` +
          `&return_url=${encodeURIComponent(returnUrl)}`;

        return Response.json({ url: authorizeUrl });
      },
    },
  },
});
