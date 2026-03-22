import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { agentSessions, userSettings } from "#/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export const Route = createFileRoute("/api/analytics/summary")({
  server: {
    handlers: {
      // GET /api/analytics/summary — current month totals
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [result] = await db
          .select({
            totalCostCents: sql<number>`coalesce(sum(${agentSessions.totalCostCents}), 0)`,
            totalInputTokens: sql<number>`coalesce(sum(${agentSessions.inputTokens}), 0)`,
            totalOutputTokens: sql<number>`coalesce(sum(${agentSessions.outputTokens}), 0)`,
            sessionCount: sql<number>`count(*)`,
            tasksCompleted: sql<number>`coalesce(sum(${agentSessions.tasksCompleted}), 0)`,
          })
          .from(agentSessions)
          .where(
            and(
              eq(agentSessions.userId, session.user.id),
              gte(agentSessions.startedAt, monthStart),
            ),
          );

        // Get budget info
        const [settings] = await db
          .select({
            monthlyBudgetCents: userSettings.monthlyBudgetCents,
            budgetAlertThreshold: userSettings.budgetAlertThreshold,
          })
          .from(userSettings)
          .where(eq(userSettings.userId, session.user.id))
          .limit(1);

        const avgCost = (result?.sessionCount ?? 0) > 0
          ? Math.round((result?.totalCostCents ?? 0) / (result?.sessionCount ?? 1))
          : 0;

        return Response.json({
          totalCostCents: result?.totalCostCents ?? 0,
          totalInputTokens: result?.totalInputTokens ?? 0,
          totalOutputTokens: result?.totalOutputTokens ?? 0,
          sessionCount: result?.sessionCount ?? 0,
          tasksCompleted: result?.tasksCompleted ?? 0,
          avgCostCentsPerSession: avgCost,
          monthlyBudgetCents: settings?.monthlyBudgetCents ?? null,
          budgetAlertThreshold: settings?.budgetAlertThreshold ?? 80,
          monthLabel: now.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        });
      },
    },
  },
});
