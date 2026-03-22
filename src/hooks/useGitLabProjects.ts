import { useQuery } from "@tanstack/react-query";
import type { GitLabProject } from "#/lib/gitlab/types";

export function useGitLabProjects() {
  return useQuery<GitLabProject[]>({
    queryKey: ["gitlab", "projects"],
    queryFn: async () => {
      const res = await fetch("/api/gitlab/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });
}
