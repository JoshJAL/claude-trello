import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface WsEvent {
  type: string;
  data?: {
    type?: string;
    source?: string;
    sourceIdentifier?: string;
    [key: string]: unknown;
  };
}

/**
 * Hook that connects to the SSE-based real-time event stream.
 * Automatically reconnects on disconnect. Invalidates relevant
 * TanStack Query caches when webhook events arrive.
 */
export function useWebSocket(enabled = true) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectDelayRef = useRef(1000);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (eventSourceRef.current) return;

    setStatus("connecting");

    const es = new EventSource("/api/ws");
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus("connected");
      reconnectDelayRef.current = 1000; // Reset backoff
    };

    es.onmessage = (event) => {
      try {
        const msg: WsEvent = JSON.parse(event.data);

        if (msg.type === "connected") {
          return; // Initial connection acknowledgment
        }

        if (msg.type === "webhook_event" && msg.data) {
          // Invalidate relevant query caches based on source
          const source = msg.data.source;
          const sourceId = msg.data.sourceIdentifier;

          if (source === "trello" && sourceId) {
            void queryClient.invalidateQueries({
              queryKey: ["trello", "cards", sourceId],
            });
          } else if (source === "github" && sourceId) {
            const [owner, repo] = (sourceId as string).split("/");
            if (owner && repo) {
              void queryClient.invalidateQueries({
                queryKey: ["github", "issues", owner, repo],
              });
            }
          } else if (source === "gitlab" && sourceId) {
            void queryClient.invalidateQueries({
              queryKey: ["gitlab", "issues", Number(sourceId)],
            });
          }

          // Also invalidate session list in case status changed
          void queryClient.invalidateQueries({
            queryKey: ["sessions"],
          });
        }
      } catch {
        // Ignore parse errors (e.g. ping comments)
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setStatus("disconnected");

      // Exponential backoff reconnect (max 30s)
      const delay = Math.min(reconnectDelayRef.current, 30_000);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = delay * 2;
        connect();
      }, delay);
    };
  }, [enabled, queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return { status };
}
