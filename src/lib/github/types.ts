export interface GitHubRepo {
  id: number;
  full_name: string; // "owner/repo"
  name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  owner: { login: string };
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  labels: Array<{ name: string }>;
  assignees: Array<{ login: string }>;
}
