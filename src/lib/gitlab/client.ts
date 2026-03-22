import type { GitLabProject, GitLabIssue } from "./types";

const GITLAB_API = "https://gitlab.com/api/v4";

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
    "/projects?membership=true&simple=true&min_access_level=20&order_by=last_activity_at&per_page=50",
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
  noteBody: string,
): Promise<void> {
  await gitlabFetch(
    `/projects/${projectId}/issues/${issueIid}/notes`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody }),
    },
  );
}

export async function getBranches(
  token: string,
  projectId: number,
): Promise<string[]> {
  const branches = await gitlabFetch<Array<{ name: string }>>(
    `/projects/${projectId}/repository/branches?per_page=100`,
    token,
  );
  return branches.map((b) => b.name);
}

export async function createMergeRequest(
  token: string,
  projectId: number,
  title: string,
  description: string,
  sourceBranch: string,
  targetBranch: string,
  draft?: boolean,
): Promise<{ iid: number; web_url: string }> {
  // GitLab supports a "Draft: " title prefix for draft MRs
  const mrTitle = draft ? `Draft: ${title}` : title;
  return gitlabFetch<{ iid: number; web_url: string }>(
    `/projects/${projectId}/merge_requests`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: mrTitle,
        description,
        source_branch: sourceBranch,
        target_branch: targetBranch,
      }),
    },
  );
}

export interface GitLabTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null; // seconds
}

/**
 * Exchange an OAuth code for an access token (and refresh token).
 */
export async function exchangeCodeForToken(code: string): Promise<GitLabTokenSet> {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const res = await fetch("https://gitlab.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITLAB_CLIENT_ID,
      client_secret: process.env.GITLAB_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${baseUrl}/api/gitlab/callback`,
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || data.error || !data.access_token) {
    const detail = data.error_description ?? data.error ?? `HTTP ${res.status}`;
    throw new Error(`GitLab token exchange failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
  };
}

/**
 * Refresh an expired GitLab access token using a refresh token.
 */
export async function refreshGitLabToken(refreshToken: string): Promise<GitLabTokenSet> {
  const res = await fetch("https://gitlab.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITLAB_CLIENT_ID,
      client_secret: process.env.GITLAB_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || data.error || !data.access_token) {
    const detail = data.error_description ?? data.error ?? `HTTP ${res.status}`;
    throw new Error(`GitLab token refresh failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
  };
}

/**
 * Verify a token by fetching the authenticated user.
 */
export async function verifyToken(
  token: string,
): Promise<{ id: number; username: string }> {
  return gitlabFetch<{ id: number; username: string }>("/user", token);
}
