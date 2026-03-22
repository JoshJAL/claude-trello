import { getServerUrl, getSessionCookie } from "./config.js";
import type {
  TrelloBoard,
  Credentials,
  IntegrationStatus,
  CardsResponse,
} from "./types.js";
import type { GitHubRepo, GitHubIssue, ParsedTask } from "./github.js";

export interface GitLabProject {
  id: number;
  path_with_namespace: string;
  name: string;
  description: string | null;
  web_url: string;
  visibility: "public" | "internal" | "private";
}

export interface GitLabIssue {
  iid: number;
  id: number;
  title: string;
  description: string | null;
  state: "opened" | "closed";
  web_url: string;
  labels: string[];
  tasks: ParsedTask[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const serverUrl = getServerUrl();
  const cookie = getSessionCookie();

  if (!cookie) {
    throw new ApiError(
      401,
      "Not logged in. Run `taskpilot login` first.",
    );
  }

  const res = await fetch(`${serverUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Origin: serverUrl,
      Cookie: cookie,
      ...((options?.headers as Record<string, string>) ?? {}),
    },
    redirect: "manual",
  });

  if (res.status === 401) {
    throw new ApiError(
      401,
      "Session expired. Run `taskpilot login` to re-authenticate.",
    );
  }

  if (!res.ok) {
    let errorMsg = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as Record<string, string>;
      if (body.error) errorMsg = body.error;
    } catch {
      // Use default error message
    }
    throw new ApiError(res.status, errorMsg);
  }

  return res.json() as Promise<T>;
}

export async function signIn(
  serverUrl: string,
  email: string,
  password: string,
): Promise<{ cookies: string; user: { name: string; email: string } }> {
  const res = await fetch(`${serverUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: serverUrl,
    },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });

  if (!res.ok) {
    let errorMsg = "Sign-in failed";
    try {
      const body = (await res.json()) as Record<string, string>;
      errorMsg = body.message || body.error || errorMsg;
    } catch {
      // Use default error message
    }
    throw new ApiError(res.status, errorMsg);
  }

  const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
  const cookies = setCookieHeaders
    .map((c: string) => c.split(";")[0])
    .join("; ");

  if (!cookies) {
    throw new ApiError(500, "No session cookie received from server");
  }

  const data = (await res.json()) as {
    user: { name: string; email: string };
  };
  return { cookies, user: data.user };
}

export async function signUp(
  serverUrl: string,
  name: string,
  email: string,
  password: string,
): Promise<{ cookies: string; user: { name: string; email: string } }> {
  const res = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: serverUrl,
    },
    body: JSON.stringify({ name, email, password }),
    redirect: "manual",
  });

  if (!res.ok) {
    let errorMsg = "Registration failed";
    try {
      const body = (await res.json()) as Record<string, string>;
      errorMsg = body.message || body.error || errorMsg;
    } catch {
      // Use default error message
    }
    throw new ApiError(res.status, errorMsg);
  }

  const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
  const cookies = setCookieHeaders
    .map((c: string) => c.split(";")[0])
    .join("; ");

  if (!cookies) {
    throw new ApiError(500, "No session cookie received from server");
  }

  const data = (await res.json()) as {
    user: { name: string; email: string };
  };
  return { cookies, user: data.user };
}

export async function getTrelloAuthUrl(): Promise<string> {
  const data = await apiFetch<{ url: string }>("/api/trello/authorize");
  return data.url;
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await apiFetch<{ success: boolean }>("/api/settings/apikey", {
    method: "POST",
    body: JSON.stringify({ apiKey }),
  });
}

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  return apiFetch<IntegrationStatus>("/api/settings/status");
}

export async function getBoards(): Promise<TrelloBoard[]> {
  return apiFetch<TrelloBoard[]>("/api/trello/boards");
}

export async function getBoardData(boardId: string): Promise<CardsResponse> {
  return apiFetch<CardsResponse>(
    `/api/trello/cards?boardId=${encodeURIComponent(boardId)}`,
  );
}

export async function getCredentials(providerId?: string): Promise<Credentials> {
  const params = new URLSearchParams();
  if (providerId) params.set("providerId", providerId);
  const qs = params.toString();
  return apiFetch<Credentials>(`/api/cli/credentials${qs ? `?${qs}` : ""}`);
}

export async function getGitHubRepos(): Promise<GitHubRepo[]> {
  return apiFetch<GitHubRepo[]>("/api/github/repos");
}

export async function getGitHubIssues(
  owner: string,
  repo: string,
): Promise<Array<GitHubIssue & { tasks: ParsedTask[] }>> {
  return apiFetch<Array<GitHubIssue & { tasks: ParsedTask[] }>>(
    `/api/github/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
  );
}

export async function getGitLabProjects(): Promise<GitLabProject[]> {
  return apiFetch<GitLabProject[]>("/api/gitlab/projects");
}

export async function getGitLabIssues(
  projectId: number,
): Promise<GitLabIssue[]> {
  return apiFetch<GitLabIssue[]>(
    `/api/gitlab/issues?projectId=${projectId}`,
  );
}

// ── Session History (Phase 15) ────────────────────────────────────────────────

export interface AgentSessionSummary {
  id: string;
  source: string;
  sourceIdentifier: string;
  sourceName: string;
  providerId: string;
  mode: "sequential" | "parallel";
  maxConcurrency: number | null;
  initialMessage: string | null;
  status: "running" | "completed" | "failed" | "cancelled";
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  totalCostCents: number;
  tasksTotal: number;
  tasksCompleted: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

export interface SessionListResponse {
  sessions: AgentSessionSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: string;
  agentIndex: number | null;
  cardId: string | null;
  content: Record<string, unknown>;
  sequence: number;
  timestamp: string;
}

export interface SessionEventsResponse {
  events: SessionEvent[];
  total: number;
  limit: number;
  offset: number;
}

export async function getSessions(opts?: {
  limit?: number;
  offset?: number;
  source?: string;
  status?: string;
  sort?: string;
}): Promise<SessionListResponse> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.source) params.set("source", opts.source);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.sort) params.set("sort", opts.sort);
  const qs = params.toString();
  return apiFetch<SessionListResponse>(`/api/sessions${qs ? `?${qs}` : ""}`);
}

export async function getSessionDetail(
  sessionId: string,
): Promise<{ session: AgentSessionSummary }> {
  return apiFetch<{ session: AgentSessionSummary }>(
    `/api/sessions/${encodeURIComponent(sessionId)}`,
  );
}

export async function getSessionEvents(
  sessionId: string,
  limit = 100,
  offset = 0,
): Promise<SessionEventsResponse> {
  return apiFetch<SessionEventsResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/events?limit=${limit}&offset=${offset}`,
  );
}
