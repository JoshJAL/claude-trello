/**
 * GitHub Contents/Trees/Search API — file operations for web mode.
 * All operations use the GitHub REST API v3 instead of local filesystem.
 */

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

// ── Types ──────────────────────────────────────────────────────────────────

interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string; // base64 encoded
  encoding: string;
  type: "file";
}

interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
}

interface GitHubTree {
  sha: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

interface GitHubCommitResult {
  content: { sha: string } | null;
  commit: { sha: string; message: string };
}

interface GitHubSearchResult {
  total_count: number;
  items: Array<{
    name: string;
    path: string;
    sha: string;
    html_url: string;
    repository: { full_name: string };
    text_matches?: Array<{
      fragment: string;
      matches: Array<{ text: string; indices: number[] }>;
    }>;
  }>;
}

interface GitHubRef {
  ref: string;
  object: { sha: string; type: string };
}

// ── File Operations ────────────────────────────────────────────────────────

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<{ content: string; sha: string }> {
  const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const data = await githubFetch<GitHubFileContent>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}${refParam}`,
    token,
  );

  const content = Buffer.from(data.content, "base64").toString("utf8");
  return { content, sha: data.sha };
}

export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
  branch?: string,
): Promise<{ sha: string }> {
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
  };
  if (sha) body.sha = sha;
  if (branch) body.branch = branch;

  const result = await githubFetch<GitHubCommitResult>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  return { sha: result.content?.sha ?? result.commit.sha };
}

// ── Tree / Directory ───────────────────────────────────────────────────────

export async function getTree(
  token: string,
  owner: string,
  repo: string,
  ref?: string,
  recursive?: boolean,
): Promise<GitHubTreeEntry[]> {
  const treeRef = ref ?? "HEAD";
  const recursiveParam = recursive ? "?recursive=1" : "";
  const data = await githubFetch<GitHubTree>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(treeRef)}${recursiveParam}`,
    token,
  );

  return data.tree;
}

// ── Code Search ────────────────────────────────────────────────────────────

export async function searchCode(
  token: string,
  owner: string,
  repo: string,
  searchQuery: string,
): Promise<GitHubSearchResult["items"]> {
  const q = encodeURIComponent(`${searchQuery} repo:${owner}/${repo}`);
  const data = await githubFetch<GitHubSearchResult>(
    `/search/code?q=${q}`,
    token,
    {
      headers: {
        Accept: "application/vnd.github.v3.text-match+json",
      },
    },
  );

  return data.items;
}

// ── Branch Operations ──────────────────────────────────────────────────────

export async function getDefaultBranch(
  token: string,
  owner: string,
  repo: string,
): Promise<string> {
  const data = await githubFetch<{ default_branch: string }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    token,
  );
  return data.default_branch;
}

export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  fromRef: string,
): Promise<void> {
  // Get the SHA of the source ref
  const refData = await githubFetch<GitHubRef>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(fromRef)}`,
    token,
  );

  // Create the new branch
  await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      }),
    },
  );
}
