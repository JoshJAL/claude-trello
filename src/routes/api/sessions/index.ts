import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { agentSessions } from "#/lib/db/schema";
import { eq, desc, asc, sql, and } from "drizzle-orm";
import type { AgentSessionSummary, SessionStatus } from "#/lib/types";

export const Route = createFileRoute("/api/sessions/")({
  server: {
    handlers: {
      // GET /api/sessions — list user's sessions (paginated, filterable)
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const source = url.searchParams.get("source") ?? undefined;
        const status = url.searchParams.get("status") as SessionStatus | undefined;
        const sort = url.searchParams.get("sort") ?? "newest";
        const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 20), 100);
        const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

        // Build where conditions
        const conditions = [eq(agentSessions.userId, session.user.id)];
        if (source) {
          conditions.push(eq(agentSessions.source, source));
        }
        if (status) {
          conditions.push(eq(agentSessions.status, status));
        }

        // Get total count
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(agentSessions)
          .where(and(...conditions));
        const total = countResult?.count ?? 0;

        // Determine sort order
        let orderBy;
        switch (sort) {
          case "oldest":
            orderBy = asc(agentSessions.startedAt);
            break;
          case "costliest":
            orderBy = desc(agentSessions.totalCostCents);
            break;
          default:
            orderBy = desc(agentSessions.startedAt);
        }

        // Fetch sessions
        const rows = await db
          .select()
          .from(agentSessions)
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset);

        const sessions: AgentSessionSummary[] = rows.map((row) => {
          const startedAt = row.startedAt;
          const completedAt = row.completedAt;
          const durationMs =
            startedAt && completedAt
              ? completedAt.getTime() - startedAt.getTime()
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
            startedAt: startedAt.toISOString(),
            completedAt: completedAt?.toISOString() ?? null,
            durationMs,
          };
        });

        return Response.json({ sessions, total, limit, offset });
      },
    },
  },
});
