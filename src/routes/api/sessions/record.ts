import { createFileRoute } from "@tanstack/react-router";
import { randomUUID } from "crypto";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { agentSessions, sessionEvents } from "#/lib/db/schema";

export const Route = createFileRoute("/api/sessions/record")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
          source,
          sourceIdentifier,
          sourceName,
          providerId,
          mode,
          maxConcurrency,
          initialMessage,
          status,
          errorMessage,
          inputTokens,
          outputTokens,
          totalCostCents,
          tasksTotal,
          tasksCompleted,
          startedAt,
          completedAt,
          events,
        } = body as {
          source: string;
          sourceIdentifier: string;
          sourceName: string;
          providerId: string;
          mode: string;
          maxConcurrency?: number;
          initialMessage?: string;
          status: string;
          errorMessage?: string;
          inputTokens: number;
          outputTokens: number;
          totalCostCents: number;
          tasksTotal: number;
          tasksCompleted: number;
          startedAt: string;
          completedAt?: string;
          events?: Array<{
            type: string;
            content: Record<string, unknown>;
            sequence: number;
            timestamp: string;
          }>;
        };

        if (!source || !sourceIdentifier || !sourceName || !providerId || !status) {
          return Response.json(
            { error: "Missing required fields" },
            { status: 400 },
          );
        }

        const now = new Date();
        const sessionId = randomUUID();

        await db.insert(agentSessions).values({
          id: sessionId,
          userId: session.user.id,
          source,
          sourceIdentifier,
          sourceName,
          providerId,
          mode: mode ?? "sequential",
          maxConcurrency: maxConcurrency ?? null,
          initialMessage: initialMessage ?? null,
          status,
          errorMessage: errorMessage ?? null,
          inputTokens: inputTokens ?? 0,
          outputTokens: outputTokens ?? 0,
          totalCostCents: totalCostCents ?? 0,
          tasksTotal: tasksTotal ?? 0,
          tasksCompleted: tasksCompleted ?? 0,
          startedAt: new Date(startedAt),
          completedAt: completedAt ? new Date(completedAt) : null,
          createdAt: now,
          updatedAt: now,
        });

        // Insert events in batches
        if (events && events.length > 0) {
          const eventRows = events.map((e, i) => ({
            id: randomUUID(),
            sessionId,
            type: e.type,
            agentIndex: null,
            cardId: null,
            content: JSON.stringify(e.content),
            sequence: e.sequence ?? i,
            timestamp: new Date(e.timestamp),
          }));

          // Insert in batches of 100 to avoid hitting SQLite limits
          for (let i = 0; i < eventRows.length; i += 100) {
            await db.insert(sessionEvents).values(eventRows.slice(i, i + 100));
          }
        }

        return Response.json({ id: sessionId, success: true });
      },
    },
  },
});
