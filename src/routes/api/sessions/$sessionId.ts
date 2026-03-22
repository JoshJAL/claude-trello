import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { agentSessions } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { AgentSessionSummary, SessionStatus } from "#/lib/types";

function toSummary(row: typeof agentSessions.$inferSelect): AgentSessionSummary {
  const durationMs =
    row.startedAt && row.completedAt
      ? row.completedAt.getTime() - row.startedAt.getTime()
      : null;

  return {
    id: row.id,
    source: row.source,
    sourceIdentifier: row.sourceIdentifier,
    sourceName: row.sourceName,
    providerId: row.providerId,
    mode: row.mode as "sequential" | "parallel",
    maxConcurrency: row.maxConcurrency,
    initialMessage: row.initialMessage,
    status: row.status as SessionStatus,
    errorMessage: row.errorMessage,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    totalCostCents: row.totalCostCents,
    tasksTotal: row.tasksTotal,
    tasksCompleted: row.tasksCompleted,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    durationMs,
  };
}

export const Route = createFileRoute("/api/sessions/$sessionId")({
  server: {
    handlers: {
      // GET /api/sessions/:sessionId — session detail
      GET: async ({ request, params }: { request: Request; params: { sessionId: string } }) => {
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

        return Response.json({ session: toSummary(row) });
      },

      // DELETE /api/sessions/:sessionId — delete a session
      DELETE: async ({ request, params }: { request: Request; params: { sessionId: string } }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Ensure the session belongs to this user
        const [row] = await db
          .select({ id: agentSessions.id })
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

        // Cascade delete will remove session_events too
        await db
          .delete(agentSessions)
          .where(eq(agentSessions.id, params.sessionId));

        return Response.json({ success: true });
      },
    },
  },
});
