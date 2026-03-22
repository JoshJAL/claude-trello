import { useQuery } from "@tanstack/react-query";
import type { GitHubIssue } from "#/lib/github/types";
import type { ParsedTask } from "#/lib/tasks/parser";

export interface GitHubIssueWithTasks extends GitHubIssue {
  tasks: ParsedTask[];
}

export function useGitHubIssues(
  owner: string,
  repo: string,
  polling: boolean = false,
) {
  return useQuery<GitHubIssueWithTasks[]>({
    queryKey: ["github", "issues", owner, repo],
    queryFn: async () => {
      const res = await fetch(
        `/api/github/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch issues");
      return res.json();
    },
    refetchInterval: polling ? 5000 : undefined,
  });
}
