import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { userSettings } from "#/lib/db/schema";
import { eq } from "drizzle-orm";
import type { PrAutomationConfig } from "#/lib/types";
import { DEFAULT_PR_AUTOMATION_CONFIG } from "#/lib/types";

function parsePrAutomationConfig(raw: string | null): PrAutomationConfig {
  if (!raw) return { ...DEFAULT_PR_AUTOMATION_CONFIG };
  try {
    const parsed = JSON.parse(raw) as Partial<PrAutomationConfig>;
    return {
      enabled: parsed.enabled ?? DEFAULT_PR_AUTOMATION_CONFIG.enabled,
      autoDraft: parsed.autoDraft ?? DEFAULT_PR_AUTOMATION_CONFIG.autoDraft,
      autoLinkIssue:
        parsed.autoLinkIssue ?? DEFAULT_PR_AUTOMATION_CONFIG.autoLinkIssue,
      branchNamingPattern:
        parsed.branchNamingPattern ??
        DEFAULT_PR_AUTOMATION_CONFIG.branchNamingPattern,
    };
  } catch {
    return { ...DEFAULT_PR_AUTOMATION_CONFIG };
  }
}

export const Route = createFileRoute("/api/settings/automation")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [settings] = await db
          .select({ prAutomationConfig: userSettings.prAutomationConfig })
          .from(userSettings)
          .where(eq(userSettings.userId, session.user.id))
          .limit(1);

        const config = parsePrAutomationConfig(
          settings?.prAutomationConfig ?? null,
        );

        return Response.json(config);
      },

      PUT: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { error: "Invalid JSON body" },
            { status: 400 },
          );
        }

        const config: PrAutomationConfig = {
          enabled: body.enabled === true,
          autoDraft: body.autoDraft !== false,
          autoLinkIssue: body.autoLinkIssue !== false,
          branchNamingPattern:
            typeof body.branchNamingPattern === "string" &&
            body.branchNamingPattern.trim().length > 0
              ? body.branchNamingPattern.trim()
              : DEFAULT_PR_AUTOMATION_CONFIG.branchNamingPattern,
        };

        const serialized = JSON.stringify(config);
        const now = new Date();

        // Upsert into user_settings
        await db
          .insert(userSettings)
          .values({
            userId: session.user.id,
            prAutomationConfig: serialized,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: userSettings.userId,
            set: {
              prAutomationConfig: serialized,
              updatedAt: now,
            },
          });

        return Response.json({ success: true, config });
      },
    },
  },
});
