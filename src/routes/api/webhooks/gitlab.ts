import { createFileRoute } from "@tanstack/react-router";
import { processWebhook } from "#/lib/webhooks/processor";

export const Route = createFileRoute("/api/webhooks/gitlab")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // Validate X-Gitlab-Token if webhook secret is configured
        const webhookSecret = process.env.GITLAB_WEBHOOK_SECRET;
        if (webhookSecret) {
          const token = request.headers.get("x-gitlab-token");
          if (token !== webhookSecret) {
            return Response.json({ error: "Invalid token" }, { status: 401 });
          }
        }

        let payload: Record<string, unknown>;
        try {
          payload = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const objectKind = (payload.object_kind as string) ?? "unknown";
        const project = payload.project as Record<string, unknown> | undefined;
        const projectId = String(project?.id ?? "");

        void processWebhook({
          source: "gitlab",
          eventType: objectKind,
          sourceIdentifier: projectId,
          payload,
        });

        return Response.json({ ok: true });
      },
    },
  },
});
