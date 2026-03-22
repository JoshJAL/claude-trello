import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { processWebhook } from "#/lib/webhooks/processor";

export const Route = createFileRoute("/api/webhooks/github")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = await request.text();

        // Validate X-Hub-Signature-256 if webhook secret is configured
        const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
        if (webhookSecret) {
          const signature = request.headers.get("x-hub-signature-256");
          if (!signature) {
            return Response.json({ error: "Missing signature" }, { status: 401 });
          }

          const expected = "sha256=" + createHmac("sha256", webhookSecret)
            .update(body)
            .digest("hex");

          const sigBuffer = Buffer.from(signature);
          const expectedBuffer = Buffer.from(expected);

          if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
            return Response.json({ error: "Invalid signature" }, { status: 401 });
          }
        }

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(body);
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const eventType = request.headers.get("x-github-event") ?? "unknown";
        const repo = payload.repository as Record<string, unknown> | undefined;
        const fullName = (repo?.full_name as string) ?? "";

        void processWebhook({
          source: "github",
          eventType,
          sourceIdentifier: fullName,
          payload,
        });

        return Response.json({ ok: true });
      },
    },
  },
});
