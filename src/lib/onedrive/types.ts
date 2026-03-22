export interface OneDriveTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
}

export interface DriveItem {
  id: string;
  name: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
  size: number;
  lastModifiedDateTime: string;
  webUrl: string;
}

export interface WorkbookData {
  itemId: string;
  name: string;
  worksheets: Array<{
    name: string;
    values: string[][];
  }>;
}
