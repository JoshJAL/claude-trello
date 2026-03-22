import { useQuery } from "@tanstack/react-query";
import type { GitHubRepo } from "#/lib/github/types";

export function useGitHubRepos() {
  return useQuery<GitHubRepo[]>({
    queryKey: ["github", "repos"],
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/github/repos", { signal });
      if (!res.ok) throw new Error("Failed to fetch repos");
      return res.json();
    },
  });
}
