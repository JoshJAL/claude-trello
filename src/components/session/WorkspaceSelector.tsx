import { useState, useRef, useEffect, useMemo } from "react";
import { HardDrive, Cloud, X, Search, FolderOpen } from "lucide-react";
import {
  useGoogleDriveFolders,
  useOneDriveFolders,
} from "#/hooks/useStorageFolders";
import type { StorageFolder } from "#/hooks/useStorageFolders";

interface WorkspaceOption {
  key: string; // "google:<folderId>" or "onedrive:<folderId>"
  label: string;
  provider: "google" | "onedrive";
}

interface WorkspaceSelectorProps {
  workspaceKey: string;
  onWorkspaceKeyChange: (key: string) => void;
  googleDriveLinked: boolean;
  oneDriveLinked: boolean;
}

export function WorkspaceSelector({
  workspaceKey,
  onWorkspaceKeyChange,
  googleDriveLinked,
  oneDriveLinked,
}: WorkspaceSelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: googleFolders } = useGoogleDriveFolders("root", googleDriveLinked);
  const { data: onedriveFolders } = useOneDriveFolders("root", oneDriveLinked);

  const options = useMemo(() => {
    const list: WorkspaceOption[] = [];
    if (googleDriveLinked && googleFolders) {
      // Add root option
      list.push({
        key: "google:root",
        label: "Google Drive (root)",
        provider: "google",
      });
      for (const f of googleFolders) {
        list.push({
          key: `google:${f.id}`,
          label: f.name,
          provider: "google",
        });
      }
    }
    if (oneDriveLinked && onedriveFolders) {
      list.push({
        key: "onedrive:root",
        label: "OneDrive (root)",
        provider: "onedrive",
      });
      for (const f of onedriveFolders as StorageFolder[]) {
        list.push({
          key: `onedrive:${f.id}`,
          label: f.name,
          provider: "onedrive",
        });
      }
    }
    return list;
  }, [googleDriveLinked, oneDriveLinked, googleFolders, onedriveFolders]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabel = useMemo(() => {
    if (!workspaceKey) return null;
    return options.find((o) => o.key === workspaceKey)?.label ?? workspaceKey;
  }, [workspaceKey, options]);

  const selectedProvider = workspaceKey.startsWith("google:") ? "google" : workspaceKey.startsWith("onedrive:") ? "onedrive" : null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(key: string) {
    onWorkspaceKeyChange(key);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onWorkspaceKeyChange("");
    setQuery("");
  }

  const ProviderIcon = selectedProvider === "google" ? Cloud : HardDrive;

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <label
        htmlFor="workspace-search"
        className="shrink-0 text-xs font-medium text-(--sea-ink-soft)"
      >
        <FolderOpen size={14} className="inline mr-1" />
        Workspace:
      </label>

      {workspaceKey ? (
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-(--shore-line) bg-white px-2 py-1.5 dark:bg-[#1e1e1e]">
          <ProviderIcon size={14} className="shrink-0 text-(--sea-ink-soft)" />
          <span className="flex-1 truncate text-xs text-(--sea-ink)">
            {selectedLabel}
          </span>
          <button
            onClick={clear}
            className="shrink-0 rounded p-0.5 text-(--sea-ink-soft) hover:bg-(--foam) hover:text-(--sea-ink)"
            title="Remove workspace"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--sea-ink-soft)"
          />
          <input
            id="workspace-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search folders..."
            className="w-full rounded-lg border border-(--shore-line) bg-white py-1.5 pl-8 pr-3 text-xs text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
          />

          {open && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-(--shore-line) bg-white shadow-lg dark:bg-[#1e1e1e]">
              <button
                onClick={() => select("")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-(--sea-ink-soft) hover:bg-(--foam)"
              >
                None (use linked repo instead)
              </button>

              {filtered.length === 0 && query.trim() && (
                <p className="px-3 py-2 text-xs text-(--sea-ink-soft)">
                  No folders matching &ldquo;{query}&rdquo;
                </p>
              )}

              {filtered.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => select(opt.key)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-(--sea-ink) hover:bg-(--foam)"
                >
                  {opt.provider === "google" ? (
                    <Cloud size={14} className="shrink-0 text-(--sea-ink-soft)" />
                  ) : (
                    <HardDrive size={14} className="shrink-0 text-(--sea-ink-soft)" />
                  )}
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
