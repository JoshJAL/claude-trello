import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account, userSettings } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "#/lib/encrypt";
import { launchClaudeSession } from "#/lib/claude";
import type { Query } from "#/lib/claude";
import type { BoardData } from "#/lib/types";

interface ActiveSession {
  query: Query;
  abortController: AbortController;
}

// Track active sessions per user to enforce one-at-a-time
const activeSessions = new Map<string, ActiveSession>();

export const Route = createFileRoute("/api/claude/session")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Rate limit: one active session per user
        if (activeSessions.has(userId)) {
          return Response.json(
            { error: "A session is already active" },
            { status: 429 },
          );
        }

        const body = await request.json();
        const boardData = body.boardData as BoardData;
        const cwd = body.cwd as string | undefined;

        if (!boardData?.board?.id || !boardData?.cards) {
          return Response.json(
            { error: "boardData is required" },
            { status: 400 },
          );
        }

        // Get Trello token
        const [trelloAccount] = await db
          .select({ accessToken: account.accessToken })
          .from(account)
          .where(
            and(
              eq(account.userId, userId),
              eq(account.providerId, "trello"),
            ),
          )
          .limit(1);

        const trelloToken = trelloAccount?.accessToken;
        if (!trelloToken) {
          return Response.json(
            { error: "Trello not connected" },
            { status: 400 },
          );
        }

        // Get and decrypt Anthropic API key
        const [settings] = await db
          .select({
            encryptedAnthropicApiKey: userSettings.encryptedAnthropicApiKey,
          })
          .from(userSettings)
          .where(eq(userSettings.userId, userId))
          .limit(1);

        if (!settings?.encryptedAnthropicApiKey) {
          return Response.json(
            { error: "Anthropic API key not configured" },
            { status: 400 },
          );
        }

        const anthropicApiKey = decrypt(settings.encryptedAnthropicApiKey);
        const abortController = new AbortController();

        const claudeQuery = launchClaudeSession({
          anthropicApiKey,
          trelloToken,
          boardData,
          cwd: cwd ?? process.cwd(),
          abortController,
        });

        activeSessions.set(userId, { query: claudeQuery, abortController });

        // Stream SSE response
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();

            try {
              for await (const message of claudeQuery) {
                const data = JSON.stringify(message);
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "done" })}\n\n`,
                ),
              );
            } catch (err) {
              const errorMsg =
                err instanceof Error ? err.message : "Unknown error";
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`,
                ),
              );
            } finally {
              activeSessions.delete(userId);
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },

      // Send user input to an active session
      PATCH: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const active = activeSessions.get(session.user.id);
        if (!active) {
          return Response.json(
            { error: "No active session" },
            { status: 404 },
          );
        }

        const body = await request.json();
        const message = body.message as string;

        if (!message) {
          return Response.json(
            { error: "message is required" },
            { status: 400 },
          );
        }

        // Feed user input into the running query as a single-item async iterable
        async function* userInput() {
          yield {
            type: "user" as const,
            message: {
              role: "user" as const,
              content: message,
            },
            parent_tool_use_id: null,
            session_id: "",
          };
        }

        await active.query.streamInput(userInput());

        return Response.json({ success: true });
      },

      DELETE: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const active = activeSessions.get(session.user.id);
        if (active) {
          active.query.close();
          activeSessions.delete(session.user.id);
        }

        return Response.json({ success: true });
      },
    },
  },
});
