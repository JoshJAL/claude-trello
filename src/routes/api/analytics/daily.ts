import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { agentSessions } from "#/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export const Route = createFileRoute("/api/analytics/daily")({
  server: {
    handlers: {
      // GET /api/analytics/daily — daily cost breakdown for last 30 days
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // SQLite: extract date from the unix timestamp stored in startedAt
        const rows = await db
          .select({
            date: sql<string>`date(${agentSessions.startedAt}, 'unixepoch')`.as("date"),
            costCents: sql<number>`coalesce(sum(${agentSessions.totalCostCents}), 0)`,
            sessions: sql<number>`count(*)`,
          })
          .from(agentSessions)
          .where(
            and(
              eq(agentSessions.userId, session.user.id),
              gte(agentSessions.startedAt, thirtyDaysAgo),
            ),
          )
          .groupBy(sql`date(${agentSessions.startedAt}, 'unixepoch')`)
          .orderBy(sql`date(${agentSessions.startedAt}, 'unixepoch')`);

        return Response.json({ days: rows });
      },
    },
  },
});
