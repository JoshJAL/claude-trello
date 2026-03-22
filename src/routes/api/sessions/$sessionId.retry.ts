import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { agentSessions } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const Route = createFileRoute("/api/sessions/$sessionId/retry")({
  server: {
    handlers: {
      // POST /api/sessions/:sessionId/retry — returns the config needed to re-run a session
      POST: async ({ request, params }: { request: Request; params: { sessionId: string } }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [row] = await db
          .select()
          .from(agentSessions)
          .where(
            and(
              eq(agentSessions.id, params.sessionId),
              eq(agentSessions.userId, session.user.id),
            ),
          )
          .limit(1);

        if (!row) {
          return Response.json({ error: "Session not found" }, { status: 404 });
        }

        if (row.status === "running") {
          return Response.json(
            { error: "Cannot retry a running session" },
            { status: 400 },
          );
        }

        // Return the session config so the client can re-launch via the session route
        return Response.json({
          retryConfig: {
            source: row.source,
            sourceIdentifier: row.sourceIdentifier,
            sourceName: row.sourceName,
            providerId: row.providerId,
            mode: row.mode,
            maxConcurrency: row.maxConcurrency,
            initialMessage: row.initialMessage,
          },
        });
      },
    },
  },
});
