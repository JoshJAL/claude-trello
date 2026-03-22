import type { OneDriveTokenSet, DriveItem, WorkbookData } from "./types";

const GRAPH_API = "https://graph.microsoft.com/v1.0";

async function graphFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${GRAPH_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Microsoft Graph error: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
    );
  }

  return res.json() as Promise<T>;
}

// ── File Operations ──────────────────────────────────────────────────────

export async function listFiles(
  token: string,
  folderId: string,
): Promise<DriveItem[]> {
  const path = folderId === "root"
    ? "/me/drive/root/children"
    : `/me/drive/items/${folderId}/children`;
  const data = await graphFetch<{ value: DriveItem[] }>(
    `${path}?$top=200&$orderby=name`,
    token,
  );
  return data.value;
}

export async function getFile(
  token: string,
  itemId: string,
): Promise<{ name: string; mimeType: string; content: string }> {
  const meta = await graphFetch<DriveItem>(
    `/me/drive/items/${itemId}`,
    token,
  );

  const mimeType = meta.file?.mimeType ?? "application/octet-stream";

  const res = await fetch(`${GRAPH_API}/me/drive/items/${itemId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
  const content = await res.text();

  return { name: meta.name, mimeType, content };
}

export async function createFile(
  token: string,
  folderId: string,
  name: string,
  content: string,
): Promise<{ id: string }> {
  const path = folderId === "root"
    ? `/me/drive/root:/${encodeURIComponent(name)}:/content`
    : `/me/drive/items/${folderId}:/${encodeURIComponent(name)}:/content`;

  const res = await fetch(`${GRAPH_API}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: content,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create file: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { id: string };
  return { id: data.id };
}

export async function updateFile(
  token: string,
  itemId: string,
  content: string,
): Promise<void> {
  const res = await fetch(
    `${GRAPH_API}/me/drive/items/${itemId}/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: content,
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to update file: ${res.status} ${text}`);
  }
}

export async function deleteFile(
  token: string,
  itemId: string,
): Promise<void> {
  const res = await fetch(`${GRAPH_API}/me/drive/items/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete file: ${res.status}`);
  }
}

export async function searchFiles(
  token: string,
  query: string,
): Promise<DriveItem[]> {
  const data = await graphFetch<{ value: DriveItem[] }>(
    `/me/drive/root/search(q='${encodeURIComponent(query)}')?$top=50`,
    token,
  );
  return data.value;
}

// ── Folder Operations ────────────────────────────────────────────────────

export async function getFolders(
  token: string,
  parentId: string = "root",
): Promise<DriveItem[]> {
  const path = parentId === "root"
    ? "/me/drive/root/children"
    : `/me/drive/items/${parentId}/children`;
  const data = await graphFetch<{ value: DriveItem[] }>(
    `${path}?$filter=folder ne null&$top=200&$orderby=name`,
    token,
  );
  return data.value;
}

// ── Excel Workbooks ──────────────────────────────────────────────────────

export async function getWorkbook(
  token: string,
  itemId: string,
): Promise<WorkbookData> {
  const meta = await graphFetch<DriveItem>(
    `/me/drive/items/${itemId}`,
    token,
  );

  const sheetsData = await graphFetch<{
    value: Array<{ name: string; id: string }>;
  }>(
    `/me/drive/items/${itemId}/workbook/worksheets`,
    token,
  );

  const worksheets = await Promise.all(
    sheetsData.value.map(async (sheet) => {
      try {
        const rangeData = await graphFetch<{
          values: string[][];
        }>(
          `/me/drive/items/${itemId}/workbook/worksheets('${encodeURIComponent(sheet.name)}')/usedRange`,
          token,
        );
        return {
          name: sheet.name,
          values: rangeData.values ?? [],
        };
      } catch {
        return { name: sheet.name, values: [] };
      }
    }),
  );

  return {
    itemId,
    name: meta.name,
    worksheets,
  };
}

export async function updateRange(
  token: string,
  itemId: string,
  worksheet: string,
  range: string,
  values: string[][],
): Promise<void> {
  await graphFetch(
    `/me/drive/items/${itemId}/workbook/worksheets('${encodeURIComponent(worksheet)}')/range(address='${range}')`,
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    },
  );
}

export async function appendRows(
  token: string,
  itemId: string,
  worksheet: string,
  values: string[][],
): Promise<void> {
  // Get used range to find the next empty row
  const rangeData = await graphFetch<{ address: string; rowCount: number }>(
    `/me/drive/items/${itemId}/workbook/worksheets('${encodeURIComponent(worksheet)}')/usedRange`,
    token,
  );

  const nextRow = rangeData.rowCount + 1;
  const cols = values[0]?.length ?? 1;
  const colLetter = String.fromCharCode(64 + cols);
  const endRow = nextRow + values.length - 1;
  const range = `A${nextRow}:${colLetter}${endRow}`;

  await updateRange(token, itemId, worksheet, range, values);
}

// ── OAuth ────────────────────────────────────────────────────────────────

export async function exchangeCodeForToken(code: string): Promise<OneDriveTokenSet> {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const tenant = process.env.ONEDRIVE_TENANT_ID || "common";

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.ONEDRIVE_CLIENT_ID!,
        client_secret: process.env.ONEDRIVE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${baseUrl}/api/onedrive/callback`,
        scope: "Files.ReadWrite.All User.Read offline_access",
      }).toString(),
    },
  );

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || data.error || !data.access_token) {
    const detail = data.error_description ?? data.error ?? `HTTP ${res.status}`;
    throw new Error(`OneDrive token exchange failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
  };
}

export async function refreshOneDriveToken(refreshToken: string): Promise<OneDriveTokenSet> {
  const tenant = process.env.ONEDRIVE_TENANT_ID || "common";

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.ONEDRIVE_CLIENT_ID!,
        client_secret: process.env.ONEDRIVE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "Files.ReadWrite.All User.Read offline_access",
      }).toString(),
    },
  );

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || data.error || !data.access_token) {
    const detail = data.error_description ?? data.error ?? `HTTP ${res.status}`;
    throw new Error(`OneDrive token refresh failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
  };
}

export async function verifyToken(
  token: string,
): Promise<{ id: string; displayName: string }> {
  return graphFetch<{ id: string; displayName: string }>("/me", token);
}
