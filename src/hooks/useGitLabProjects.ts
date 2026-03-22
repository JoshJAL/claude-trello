import { useQuery } from "@tanstack/react-query";
import type { GitLabProject } from "#/lib/gitlab/types";

export function useGitLabProjects(enabled: boolean = true) {
  return useQuery<GitLabProject[]>({
    queryKey: ["gitlab", "projects"],
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/gitlab/projects", { signal });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes — GitLab API can be slow
  });
}
