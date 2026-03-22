export interface GitLabProject {
  id: number;
  path_with_namespace: string; // "group/project"
  name: string;
  description: string | null;
  web_url: string;
  visibility: "public" | "internal" | "private";
  namespace: { full_path: string };
}

export interface GitLabIssue {
  iid: number; // project-scoped issue number (use for API calls)
  id: number; // global ID
  title: string;
  description: string | null;
  state: "opened" | "closed";
  web_url: string;
  labels: string[];
  assignees: Array<{ username: string }>;
}
