import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SessionListResponse,
  SessionDetailResponse,
  SessionEventsResponse,
  SessionListQuery,
} from "#/lib/types";

async function fetchSessions(query: SessionListQuery): Promise<SessionListResponse> {
  const params = new URLSearchParams();
  if (query.source) params.set("source", query.source);
  if (query.status) params.set("status", query.status);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  if (query.sort) params.set("sort", query.sort);

  const res = await fetch(`/api/sessions?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

async function fetchSessionDetail(sessionId: string): Promise<SessionDetailResponse> {
  const res = await fetch(`/api/sessions/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
}

async function fetchSessionEvents(
  sessionId: string,
  limit = 100,
  offset = 0,
): Promise<SessionEventsResponse> {
  const res = await fetch(
    `/api/sessions/${sessionId}/events?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete session");
}

export function useSessionList(query: SessionListQuery = {}) {
  return useQuery({
    queryKey: ["sessions", query],
    queryFn: () => fetchSessions(query),
  });
}

export function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: ["sessions", sessionId],
    queryFn: () => fetchSessionDetail(sessionId),
    enabled: !!sessionId,
  });
}

export function useSessionEvents(sessionId: string, limit = 100, offset = 0) {
  return useQuery({
    queryKey: ["sessions", sessionId, "events", { limit, offset }],
    queryFn: () => fetchSessionEvents(sessionId, limit, offset),
    enabled: !!sessionId,
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
