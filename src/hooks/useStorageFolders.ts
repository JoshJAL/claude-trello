import { useQuery } from "@tanstack/react-query";

export interface StorageFolder {
  id: string;
  name: string;
}

export interface StorageFile {
  id: string;
  name: string;
  mimeType: string;
}

export function useGoogleDriveFolders(
  parentId: string = "root",
  enabled: boolean = true,
) {
  return useQuery<StorageFolder[]>({
    queryKey: ["google", "folders", parentId],
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `/api/google/folders?parentId=${encodeURIComponent(parentId)}`,
        { signal },
      );
      if (!res.ok) throw new Error("Failed to fetch Google Drive folders");
      return res.json();
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useGoogleDriveFiles(
  folderId: string,
  enabled: boolean = true,
) {
  return useQuery<StorageFile[]>({
    queryKey: ["google", "files", folderId],
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `/api/google/files?folderId=${encodeURIComponent(folderId)}`,
        { signal },
      );
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useOneDriveFiles(
  folderId: string,
  enabled: boolean = true,
) {
  return useQuery<StorageFile[]>({
    queryKey: ["onedrive", "files", folderId],
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `/api/onedrive/files?folderId=${encodeURIComponent(folderId)}`,
        { signal },
      );
      if (!res.ok) throw new Error("Failed to fetch files");
      // OneDrive returns DriveItem[] — normalize to StorageFile[]
      const items = await res.json();
      return items
        .filter((item: Record<string, unknown>) => item.file)
        .map((item: Record<string, unknown>) => ({
          id: item.id,
          name: item.name,
          mimeType: (item.file as Record<string, unknown>)?.mimeType ?? "unknown",
        }));
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useOneDriveFolders(
  parentId: string = "root",
  enabled: boolean = true,
) {
  return useQuery<StorageFolder[]>({
    queryKey: ["onedrive", "folders", parentId],
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `/api/onedrive/folders?parentId=${encodeURIComponent(parentId)}`,
        { signal },
      );
      if (!res.ok) throw new Error("Failed to fetch OneDrive folders");
      return res.json();
    },
    enabled,
    staleTime: 60 * 1000,
  });
}
