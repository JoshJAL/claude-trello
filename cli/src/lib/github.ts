const GITHUB_API = "https://api.github.com";

export interface GitHubRepo {
  id: number;
  full_name: string;
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
}

export interface ParsedTask {
  index: number;
  text: string;
  checked: boolean;
}

async function githubFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function getRepos(token: string): Promise<GitHubRepo[]> {
  return githubFetch<GitHubRepo[]>(
    "/user/repos?sort=updated&per_page=100&type=all",
    token,
  );
}

export async function getIssues(
  token: string,
  owner: string,
  repo: string,
): Promise<Array<GitHubIssue & { tasks: ParsedTask[] }>> {
  const issues = await githubFetch<GitHubIssue[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&per_page=100`,
    token,
  );

  return issues.map((issue) => ({
    ...issue,
    tasks: parseTaskList(issue.body),
  }));
}

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

export async function updateIssueBody(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
}

export async function closeIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<void> {
  await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "closed" }),
    },
  );
}
