import { useQuery } from "@tanstack/react-query";

export function useBranches(
  source: "github" | "gitlab" | "trello",
  owner?: string,
  repo?: string,
  projectId?: number,
  enabled: boolean = true,
) {
  return useQuery<string[]>({
    queryKey: ["branches", source, owner, repo, projectId],
    queryFn: async ({ signal }) => {
      let url: string;
      if (source === "github" && owner && repo) {
        url = `/api/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
      } else if (source === "gitlab" && projectId) {
        url = `/api/gitlab/branches?projectId=${projectId}`;
      } else {
        return [];
      }

      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
    enabled:
      enabled &&
      ((source === "github" && !!owner && !!repo) ||
        (source === "gitlab" && !!projectId)),
    staleTime: 60 * 1000, // 1 minute
  });
}
