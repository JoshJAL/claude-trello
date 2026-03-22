import { useQuery } from "@tanstack/react-query";
import type { IntegrationStatus } from "#/lib/types";
import type { AiProviderId } from "#/lib/providers/types";

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

  const configuredProviders: AiProviderId[] =
    data?.configuredProviders ?? [];

  const trelloLinked = data?.trelloLinked ?? false;
  const githubLinked = data?.githubLinked ?? false;
  const gitlabLinked = data?.gitlabLinked ?? false;
  const hasApiKey = data?.hasApiKey ?? false;
  const hasTaskSource = trelloLinked || githubLinked || gitlabLinked;

  return {
    trelloLinked,
    githubLinked,
    gitlabLinked,
    hasApiKey,
    configuredProviders,
    hasTaskSource,
    isReady: hasTaskSource && hasApiKey,
    isLoading,
    refetch,
  };
}
