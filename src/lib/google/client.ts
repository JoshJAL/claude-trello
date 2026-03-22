import type { GoogleTokenSet, DriveFile, DriveFolder, SpreadsheetData, DocData } from "./types";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const SHEETS_API = "https://sheets.googleapis.com/v4";
const DOCS_API = "https://docs.googleapis.com/v1";

async function googleFetch<T>(
  url: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Google API error: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
    );
  }

  return res.json() as Promise<T>;
}

// ── File Operations ──────────────────────────────────────────────────────

export async function listFiles(
  token: string,
  folderId: string,
): Promise<DriveFile[]> {
  const q = `'${folderId}' in parents and trashed = false`;
  const data = await googleFetch<{ files: DriveFile[] }>(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,size)&orderBy=name&pageSize=200`,
    token,
  );
  return data.files;
}

export async function getFile(
  token: string,
  fileId: string,
): Promise<{ name: string; mimeType: string; content: string }> {
  // Get metadata first
  const meta = await googleFetch<{ name: string; mimeType: string }>(
    `${DRIVE_API}/files/${fileId}?fields=name,mimeType`,
    token,
  );

  let content: string;

  // Google Docs/Sheets/Slides need export
  if (meta.mimeType === "application/vnd.google-apps.document") {
    content = await exportGoogleFile(token, fileId, "text/markdown");
  } else if (meta.mimeType === "application/vnd.google-apps.spreadsheet") {
    content = await exportGoogleFile(token, fileId, "text/csv");
  } else {
    // Regular files: download content
    const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
    content = await res.text();
  }

  return { name: meta.name, mimeType: meta.mimeType, content };
}

async function exportGoogleFile(
  token: string,
  fileId: string,
  exportMimeType: string,
): Promise<string> {
  const res = await fetch(
    `${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Failed to export file: ${res.status}`);
  return res.text();
}

export async function createFile(
  token: string,
  folderId: string,
  name: string,
  content: string,
  mimeType: string = "text/plain",
): Promise<{ id: string }> {
  const metadata = JSON.stringify({
    name,
    parents: [folderId],
  });

  const boundary = "taskpilot_boundary";
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create file: ${res.status} ${text}`);
  }

  return res.json() as Promise<{ id: string }>;
}

export async function updateFile(
  token: string,
  fileId: string,
  content: string,
  mimeType: string = "text/plain",
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": mimeType,
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
  fileId: string,
): Promise<void> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Failed to delete file: ${res.status}`);
}

export async function searchFiles(
  token: string,
  folderId: string,
  query: string,
): Promise<DriveFile[]> {
  const q = `'${folderId}' in parents and trashed = false and (name contains '${query.replace(/'/g, "\\'")}' or fullText contains '${query.replace(/'/g, "\\'")}')`;
  const data = await googleFetch<{ files: DriveFile[] }>(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=50`,
    token,
  );
  return data.files;
}

// ── Folder Operations ────────────────────────────────────────────────────

export async function getFolders(
  token: string,
  parentId: string = "root",
): Promise<DriveFolder[]> {
  const q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const data = await googleFetch<{ files: DriveFolder[] }>(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&orderBy=name&pageSize=200`,
    token,
  );
  return data.files;
}

// ── Google Sheets ────────────────────────────────────────────────────────

export async function getSpreadsheet(
  token: string,
  spreadsheetId: string,
): Promise<SpreadsheetData> {
  const data = await googleFetch<{
    spreadsheetId: string;
    properties: { title: string };
    sheets: Array<{
      properties: { title: string; gridProperties: { rowCount: number; columnCount: number } };
    }>;
  }>(
    `${SHEETS_API}/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`,
    token,
  );

  const sheets = await Promise.all(
    data.sheets.map(async (sheet) => {
      const range = sheet.properties.title;
      const valuesData = await googleFetch<{ values?: string[][] }>(
        `${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        token,
      );
      return {
        title: sheet.properties.title,
        rowCount: sheet.properties.gridProperties.rowCount,
        columnCount: sheet.properties.gridProperties.columnCount,
        values: valuesData.values ?? [],
      };
    }),
  );

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties.title,
    sheets,
  };
}

export async function updateCells(
  token: string,
  spreadsheetId: string,
  range: string,
  values: string[][],
): Promise<void> {
  await googleFetch(
    `${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    },
  );
}

export async function appendRows(
  token: string,
  spreadsheetId: string,
  range: string,
  values: string[][],
): Promise<void> {
  await googleFetch(
    `${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    },
  );
}

// ── Google Docs ──────────────────────────────────────────────────────────

export async function getDocument(
  token: string,
  documentId: string,
): Promise<DocData> {
  // Export as Markdown for a clean readable representation
  const content = await exportGoogleFile(token, documentId, "text/markdown");
  const meta = await googleFetch<{ name: string }>(
    `${DRIVE_API}/files/${documentId}?fields=name`,
    token,
  );

  return {
    documentId,
    title: meta.name,
    content,
  };
}

export async function updateDocument(
  token: string,
  documentId: string,
  newContent: string,
): Promise<void> {
  // Clear all existing content and insert new content
  // First, get the document to find the end index
  const doc = await googleFetch<{
    body: { content: Array<{ endIndex: number }> };
  }>(
    `${DOCS_API}/documents/${documentId}`,
    token,
  );

  const endIndex = doc.body.content[doc.body.content.length - 1]?.endIndex ?? 1;

  const requests: Array<Record<string, unknown>> = [];

  // Delete existing content (if any beyond the initial newline)
  if (endIndex > 2) {
    requests.push({
      deleteContentRange: {
        range: { startIndex: 1, endIndex: endIndex - 1 },
      },
    });
  }

  // Insert new content
  requests.push({
    insertText: {
      location: { index: 1 },
      text: newContent,
    },
  });

  await googleFetch(
    `${DOCS_API}/documents/${documentId}:batchUpdate`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    },
  );
}

export async function createDocument(
  token: string,
  title: string,
  content: string,
  folderId?: string,
): Promise<{ documentId: string }> {
  // Create the document via Docs API
  const doc = await googleFetch<{ documentId: string }>(
    `${DOCS_API}/documents`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    },
  );

  // Insert content if provided
  if (content) {
    await googleFetch(
      `${DOCS_API}/documents/${doc.documentId}:batchUpdate`,
      token,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{ insertText: { location: { index: 1 }, text: content } }],
        }),
      },
    );
  }

  // Move to the target folder if specified
  if (folderId && folderId !== "root") {
    await googleFetch(
      `${DRIVE_API}/files/${doc.documentId}?addParents=${folderId}&removeParents=root`,
      token,
      { method: "PATCH" },
    );
  }

  return { documentId: doc.documentId };
}

// ── OAuth ────────────────────────────────────────────────────────────────

export async function exchangeCodeForToken(code: string): Promise<GoogleTokenSet> {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${baseUrl}/api/google/callback`,
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
    throw new Error(`Google token exchange failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
  };
}

export async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokenSet> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
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
    throw new Error(`Google token refresh failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
  };
}

export async function verifyToken(
  token: string,
): Promise<{ id: string; email: string }> {
  return googleFetch<{ id: string; email: string }>(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    token,
  );
}
