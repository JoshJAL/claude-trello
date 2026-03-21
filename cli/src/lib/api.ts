import { getServerUrl, getSessionCookie } from "./config.js";
import type {
  TrelloBoard,
  Credentials,
  IntegrationStatus,
  CardsResponse,
} from "./types.js";

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
      "Not logged in. Run `claude-trello login` first.",
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
      "Session expired. Run `claude-trello login` to re-authenticate.",
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

export async function getCredentials(): Promise<Credentials> {
  return apiFetch<Credentials>("/api/cli/credentials");
}
