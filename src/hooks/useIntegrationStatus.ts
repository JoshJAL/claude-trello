import { useQuery } from "@tanstack/react-query";
import type { IntegrationStatus } from "#/lib/types";

async function fetchIntegrationStatus(): Promise<IntegrationStatus> {
  const res = await fetch("/api/settings/status");
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
}

export function useIntegrationStatus() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["settings", "status"],
    queryFn: fetchIntegrationStatus,
  });

  return {
    trelloLinked: data?.trelloLinked ?? false,
    hasApiKey: data?.hasApiKey ?? false,
    isReady: (data?.trelloLinked && data?.hasApiKey) ?? false,
    isLoading,
    refetch,
  };
}
