import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { userSettings } from "#/lib/db/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/settings/budget")({
  server: {
    handlers: {
      // GET /api/settings/budget — get current budget settings
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [settings] = await db
          .select({
            monthlyBudgetCents: userSettings.monthlyBudgetCents,
            budgetAlertThreshold: userSettings.budgetAlertThreshold,
          })
          .from(userSettings)
          .where(eq(userSettings.userId, session.user.id))
          .limit(1);

        return Response.json({
          monthlyBudgetCents: settings?.monthlyBudgetCents ?? null,
          budgetAlertThreshold: settings?.budgetAlertThreshold ?? 80,
        });
      },

      // PUT /api/settings/budget — update budget settings
      PUT: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const monthlyBudgetCents = body.monthlyBudgetCents as number | null;
        const budgetAlertThreshold = body.budgetAlertThreshold as number | undefined;

        // Validate
        if (monthlyBudgetCents !== null && (typeof monthlyBudgetCents !== "number" || monthlyBudgetCents < 0)) {
          return Response.json({ error: "Invalid budget amount" }, { status: 400 });
        }
        if (budgetAlertThreshold !== undefined && (budgetAlertThreshold < 0 || budgetAlertThreshold > 100)) {
          return Response.json({ error: "Alert threshold must be 0-100" }, { status: 400 });
        }

        const now = new Date();
        const userId = session.user.id;

        const [existing] = await db
          .select({ userId: userSettings.userId })
          .from(userSettings)
          .where(eq(userSettings.userId, userId))
          .limit(1);

        const updates: Record<string, unknown> = {
          monthlyBudgetCents,
          updatedAt: now,
        };
        if (budgetAlertThreshold !== undefined) {
          updates.budgetAlertThreshold = budgetAlertThreshold;
        }

        if (existing) {
          await db.update(userSettings).set(updates).where(eq(userSettings.userId, userId));
        } else {
          await db.insert(userSettings).values({
            userId,
            monthlyBudgetCents,
            budgetAlertThreshold: budgetAlertThreshold ?? 80,
            createdAt: now,
            updatedAt: now,
          });
        }

        return Response.json({ success: true });
      },
    },
  },
});
