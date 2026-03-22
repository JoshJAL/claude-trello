export interface GoogleTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
}

export interface DocData {
  documentId: string;
  title: string;
  content: string; // Markdown representation
}

export interface SpreadsheetData {
  spreadsheetId: string;
  title: string;
  sheets: Array<{
    title: string;
    rowCount: number;
    columnCount: number;
    values: string[][];
  }>;
}
