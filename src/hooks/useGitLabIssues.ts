import { useQuery } from "@tanstack/react-query";
import type { GitLabIssue } from "#/lib/gitlab/types";
import type { ParsedTask } from "#/lib/tasks/parser";

export interface GitLabIssueWithTasks extends GitLabIssue {
  tasks: ParsedTask[];
}

export function useGitLabIssues(
  projectId: number,
  polling: boolean = false,
) {
  return useQuery<GitLabIssueWithTasks[]>({
    queryKey: ["gitlab", "issues", projectId],
    queryFn: async () => {
      const res = await fetch(
        `/api/gitlab/issues?projectId=${projectId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch issues");
      return res.json();
    },
    refetchInterval: polling ? 5000 : undefined,
  });
}
