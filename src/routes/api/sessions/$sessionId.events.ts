import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { agentSessions, sessionEvents } from "#/lib/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import type { SessionEvent } from "#/lib/types";

export const Route = createFileRoute("/api/sessions/$sessionId/events")({
  server: {
    handlers: {
      // GET /api/sessions/:sessionId/events — paginated event log
      GET: async ({ request, params }: { request: Request; params: { sessionId: string } }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify the session belongs to this user
        const [agentSession] = await db
          .select({ id: agentSessions.id })
          .from(agentSessions)
          .where(
            and(
              eq(agentSessions.id, params.sessionId),
              eq(agentSessions.userId, session.user.id),
            ),
          )
          .limit(1);

        if (!agentSession) {
          return Response.json({ error: "Session not found" }, { status: 404 });
        }

        const url = new URL(request.url);
        const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 100), 500);
        const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

        // Get total count
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(sessionEvents)
          .where(eq(sessionEvents.sessionId, params.sessionId));
        const total = countResult?.count ?? 0;

        // Fetch events ordered by sequence
        const rows = await db
          .select()
          .from(sessionEvents)
          .where(eq(sessionEvents.sessionId, params.sessionId))
          .orderBy(asc(sessionEvents.sequence))
          .limit(limit)
          .offset(offset);

        const events: SessionEvent[] = rows.map((row) => ({
          id: row.id,
          sessionId: row.sessionId,
          type: row.type,
          agentIndex: row.agentIndex,
          cardId: row.cardId,
          content: JSON.parse(row.content) as Record<string, unknown>,
          sequence: row.sequence,
          timestamp: row.timestamp.toISOString(),
        }));

        return Response.json({ events, total, limit, offset });
      },
    },
  },
});
