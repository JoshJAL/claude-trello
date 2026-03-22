import type { GitHubRepo, GitHubIssue } from "./types";

const GITHUB_API = "https://api.github.com";

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
    const text = await res.text().catch(() => "");
    throw new Error(
      `GitHub API error: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
    );
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
): Promise<GitHubIssue[]> {
  return githubFetch<GitHubIssue[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&per_page=100`,
    token,
  );
}

export async function getIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<GitHubIssue> {
  return githubFetch<GitHubIssue>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
    token,
  );
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

export async function addComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  commentBody: string,
): Promise<void> {
  await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    },
  );
}

export async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string,
): Promise<{ number: number; html_url: string }> {
  return githubFetch<{ number: number; html_url: string }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, head, base }),
    },
  );
}

/**
 * Exchange an OAuth code for an access token.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (data.error || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "No access token received",
    );
  }

  return data.access_token;
}

/**
 * Verify a token by fetching the authenticated user.
 */
export async function verifyToken(
  token: string,
): Promise<{ id: number; login: string }> {
  return githubFetch<{ id: number; login: string }>("/user", token);
}
