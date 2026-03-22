import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "crypto";
import { processWebhook } from "#/lib/webhooks/processor";

export const Route = createFileRoute("/api/webhooks/trello")({
  server: {
    handlers: {
      // HEAD — Trello sends a HEAD request to verify the callback URL on registration
      HEAD: async () => {
        return new Response(null, { status: 200 });
      },

      // POST — Trello webhook event
      POST: async ({ request }: { request: Request }) => {
        const body = await request.text();

        // Validate HMAC-SHA1 signature
        const apiSecret = process.env.TRELLO_API_SECRET;
        if (apiSecret) {
          const callbackUrl = `${process.env.BASE_URL ?? process.env.BETTER_AUTH_URL}/api/webhooks/trello`;
          const hash = createHmac("sha1", apiSecret)
            .update(body + callbackUrl)
            .digest("base64");

          // Trello doesn't send a standard signature header consistently,
          // but we validate when possible
          const signature = request.headers.get("x-trello-webhook");
          if (signature && signature !== hash) {
            return Response.json({ error: "Invalid signature" }, { status: 401 });
          }
        }

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(body);
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const action = payload.action as Record<string, unknown> | undefined;
        const model = payload.model as Record<string, unknown> | undefined;
        const boardId = (model?.id as string) ?? "";

        // Process asynchronously — don't block the webhook response
        void processWebhook({
          source: "trello",
          eventType: (action?.type as string) ?? "unknown",
          sourceIdentifier: boardId,
          payload,
        });

        return Response.json({ ok: true });
      },
    },
  },
});
