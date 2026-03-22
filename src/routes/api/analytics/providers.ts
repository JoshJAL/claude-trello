import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { agentSessions } from "#/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export const Route = createFileRoute("/api/analytics/providers")({
  server: {
    handlers: {
      // GET /api/analytics/providers — cost breakdown by provider for current month
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const rows = await db
          .select({
            providerId: agentSessions.providerId,
            costCents: sql<number>`coalesce(sum(${agentSessions.totalCostCents}), 0)`,
            sessions: sql<number>`count(*)`,
            inputTokens: sql<number>`coalesce(sum(${agentSessions.inputTokens}), 0)`,
            outputTokens: sql<number>`coalesce(sum(${agentSessions.outputTokens}), 0)`,
          })
          .from(agentSessions)
          .where(
            and(
              eq(agentSessions.userId, session.user.id),
              gte(agentSessions.startedAt, monthStart),
            ),
          )
          .groupBy(agentSessions.providerId);

        return Response.json({ providers: rows });
      },
    },
  },
});
