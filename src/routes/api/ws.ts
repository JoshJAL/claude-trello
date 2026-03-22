import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { addClient, removeClient } from "#/lib/webhooks/ws-manager";
import type { WsClient } from "#/lib/webhooks/ws-manager";

/**
 * SSE-based real-time event stream.
 * Clients connect here and receive push events from webhooks.
 * Uses the same SSE pattern as the session route.
 */
export const Route = createFileRoute("/api/ws")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          start(controller) {
            // Create a WsClient adapter that writes to the SSE stream
            const client: WsClient = {
              send(data: string) {
                try {
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch {
                  // Stream closed
                }
              },
              close() {
                try {
                  controller.close();
                } catch {
                  // Already closed
                }
              },
            };

            addClient(userId, client);

            // Send initial connected event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`),
            );

            // Keep-alive ping every 30 seconds
            const pingInterval = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(`: ping\n\n`));
              } catch {
                clearInterval(pingInterval);
              }
            }, 30_000);

            // Clean up on client disconnect
            request.signal.addEventListener("abort", () => {
              clearInterval(pingInterval);
              removeClient(userId, client);
              try {
                controller.close();
              } catch {
                // Already closed
              }
            });
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
    },
  },
});
