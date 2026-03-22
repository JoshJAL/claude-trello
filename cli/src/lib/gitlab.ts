const GITLAB_API = "https://gitlab.com/api/v4";

export interface GitLabProject {
  id: number;
  path_with_namespace: string;
  name: string;
  description: string | null;
  web_url: string;
  visibility: "public" | "internal" | "private";
  namespace: { full_path: string };
}

export interface GitLabIssue {
  iid: number;
  id: number;
  title: string;
  description: string | null;
  state: "opened" | "closed";
  web_url: string;
  labels: string[];
  assignees: Array<{ username: string }>;
}

export interface ParsedTask {
  index: number;
  text: string;
  checked: boolean;
}

async function gitlabFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${GITLAB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `GitLab API error: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
    );
  }

  return res.json() as Promise<T>;
}

export async function getProjects(token: string): Promise<GitLabProject[]> {
  return gitlabFetch<GitLabProject[]>(
    "/projects?membership=true&order_by=last_activity_at&per_page=100",
    token,
  );
}

export async function getIssues(
  token: string,
  projectId: number,
): Promise<GitLabIssue[]> {
  return gitlabFetch<GitLabIssue[]>(
    `/projects/${projectId}/issues?state=opened&per_page=100`,
    token,
  );
}

export async function getIssue(
  token: string,
  projectId: number,
  issueIid: number,
): Promise<GitLabIssue> {
  return gitlabFetch<GitLabIssue>(
    `/projects/${projectId}/issues/${issueIid}`,
    token,
  );
}

export async function updateIssueDescription(
  token: string,
  projectId: number,
  issueIid: number,
  description: string,
): Promise<void> {
  await gitlabFetch(
    `/projects/${projectId}/issues/${issueIid}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    },
  );
}

export async function closeIssue(
  token: string,
  projectId: number,
  issueIid: number,
): Promise<void> {
  await gitlabFetch(
    `/projects/${projectId}/issues/${issueIid}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state_event: "close" }),
    },
  );
}

export async function addNote(
  token: string,
  projectId: number,
  issueIid: number,
  body: string,
): Promise<void> {
  await gitlabFetch(
    `/projects/${projectId}/issues/${issueIid}/notes`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
}

// Re-use the same markdown task list parser as github.ts
export function parseTaskList(body: string | null): ParsedTask[] {
  if (!body) return [];
  const lines = body.split("\n");
  const tasks: ParsedTask[] = [];
  let taskIndex = 0;

  for (const line of lines) {
    const match = line.match(/^(\s*)-\s+\[([ xX])\]\s+(.*)/);
    if (match) {
      tasks.push({
        index: taskIndex++,
        text: match[3].trim(),
        checked: match[2] !== " ",
      });
    }
  }
  return tasks;
}

export function toggleTaskItem(
  body: string,
  taskIndex: number,
  checked: boolean,
): string {
  const lines = body.split("\n");
  let currentIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*-\s+\[)([ xX])(\]\s+.*)/);
    if (match) {
      if (currentIndex === taskIndex) {
        lines[i] = `${match[1]}${checked ? "x" : " "}${match[3]}`;
        break;
      }
      currentIndex++;
    }
  }
  return lines.join("\n");
}
