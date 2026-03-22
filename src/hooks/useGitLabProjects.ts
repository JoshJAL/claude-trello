import { useQuery } from "@tanstack/react-query";
import type { GitLabProject } from "#/lib/gitlab/types";

export function useGitLabProjects(enabled: boolean = true) {
  return useQuery<GitLabProject[]>({
    queryKey: ["gitlab", "projects"],
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/gitlab/projects", { signal });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to fetch projects (${res.status})`);
      }
      return res.json();
    },
    retry: false,
    enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes — GitLab API can be slow
  });
}
