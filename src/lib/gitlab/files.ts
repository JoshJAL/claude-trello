/**
 * GitLab Repository Files/Commits API — file operations for web mode.
 * All operations use the GitLab REST API v4 instead of local filesystem.
 */

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

// ── Types ──────────────────────────────────────────────────────────────────

interface GitLabFileContent {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content: string; // base64 encoded
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
}

interface GitLabTreeEntry {
  id: string;
  name: string;
  type: "blob" | "tree";
  path: string;
  mode: string;
}

interface GitLabCommitAction {
  action: "create" | "update" | "delete" | "move";
  file_path: string;
  content?: string;
  encoding?: "text" | "base64";
  previous_path?: string;
}

interface GitLabSearchBlob {
  basename: string;
  data: string;
  path: string;
  filename: string;
  id: string | null;
  ref: string;
  startline: number;
  project_id: number;
}

// ── File Operations ────────────────────────────────────────────────────────

export async function getFileContent(
  token: string,
  projectId: number,
  path: string,
  ref?: string,
): Promise<{ content: string }> {
  const encodedPath = encodeURIComponent(path);
  const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const data = await gitlabFetch<GitLabFileContent>(
    `/projects/${projectId}/repository/files/${encodedPath}${refParam}`,
    token,
  );

  const content = Buffer.from(data.content, "base64").toString("utf8");
  return { content };
}

export async function createCommit(
  token: string,
  projectId: number,
  branch: string,
  message: string,
  actions: GitLabCommitAction[],
): Promise<{ id: string }> {
  return gitlabFetch<{ id: string }>(
    `/projects/${projectId}/repository/commits`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branch,
        commit_message: message,
        actions,
      }),
    },
  );
}

// ── Tree / Directory ───────────────────────────────────────────────────────

export async function getTree(
  token: string,
  projectId: number,
  path?: string,
  ref?: string,
  recursive?: boolean,
): Promise<GitLabTreeEntry[]> {
  const params = new URLSearchParams();
  if (path) params.set("path", path);
  if (ref) params.set("ref", ref);
  if (recursive) params.set("recursive", "true");
  params.set("per_page", "100");

  return gitlabFetch<GitLabTreeEntry[]>(
    `/projects/${projectId}/repository/tree?${params.toString()}`,
    token,
  );
}

// ── Code Search ────────────────────────────────────────────────────────────

export async function searchBlobs(
  token: string,
  projectId: number,
  searchQuery: string,
): Promise<GitLabSearchBlob[]> {
  return gitlabFetch<GitLabSearchBlob[]>(
    `/projects/${projectId}/search?scope=blobs&search=${encodeURIComponent(searchQuery)}`,
    token,
  );
}

// ── Branch Operations ──────────────────────────────────────────────────────

export async function getDefaultBranch(
  token: string,
  projectId: number,
): Promise<string> {
  const data = await gitlabFetch<{ default_branch: string }>(
    `/projects/${projectId}`,
    token,
  );
  return data.default_branch;
}

export async function createBranch(
  token: string,
  projectId: number,
  branchName: string,
  ref: string,
): Promise<void> {
  await gitlabFetch(
    `/projects/${projectId}/repository/branches`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branch: branchName,
        ref,
      }),
    },
  );
}
