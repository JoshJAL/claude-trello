import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppUpdate } from "#/lib/updates";

interface UpdatesResponse {
  updates: AppUpdate[];
  unseenCount: number;
  lastSeenAt: string | null;
}

async function fetchUpdates(): Promise<UpdatesResponse> {
  const res = await fetch("/api/updates");
  if (!res.ok) throw new Error("Failed to fetch updates");
  return res.json();
}

async function markSeen(): Promise<void> {
  const res = await fetch("/api/updates/seen", { method: "POST" });
  if (!res.ok) throw new Error("Failed to mark updates as seen");
}

export function useUpdates() {
  const { data, isLoading } = useQuery({
    queryKey: ["updates"],
    queryFn: fetchUpdates,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    updates: data?.updates ?? [],
    unseenCount: data?.unseenCount ?? 0,
    lastSeenAt: data?.lastSeenAt ?? null,
    isLoading,
  };
}

export function useMarkUpdatesSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markSeen,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["updates"] });
    },
  });
}
