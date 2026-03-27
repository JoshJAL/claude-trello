import { useState, useRef, useEffect, useMemo } from "react";
import type { GitHubRepo } from "#/lib/github/types";
import type { GitLabProject } from "#/lib/gitlab/types";
import { Github, Gitlab, X, Search } from "lucide-react";

interface RepoOption {
  key: string; // "github:owner/repo" or "gitlab:123"
  label: string;
  source: "github" | "gitlab";
}

interface RepoLinkerProps {
  linkedRepoKey: string;
  onLinkedRepoKeyChange: (key: string) => void;
  githubLinked: boolean;
  gitlabLinked: boolean;
  ghRepos?: GitHubRepo[];
  glProjects?: GitLabProject[];
}

export function RepoLinker({
  linkedRepoKey,
  onLinkedRepoKeyChange,
  githubLinked,
  gitlabLinked,
  ghRepos,
  glProjects,
}: RepoLinkerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build flat list of all repo options
  const options = useMemo(() => {
    const list: RepoOption[] = [];
    if (githubLinked && ghRepos) {
      for (const r of ghRepos) {
        list.push({
          key: `github:${r.full_name}`,
          label: r.full_name,
          source: "github",
        });
      }
    }
    if (gitlabLinked && glProjects) {
      for (const p of glProjects) {
        list.push({
          key: `gitlab:${p.id}`,
          label: p.path_with_namespace,
          source: "gitlab",
        });
      }
    }
    return list;
  }, [githubLinked, gitlabLinked, ghRepos, glProjects]);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Resolve display label for the selected repo
  const selectedLabel = useMemo(() => {
    if (!linkedRepoKey) return null;
    return options.find((o) => o.key === linkedRepoKey)?.label ?? linkedRepoKey;
  }, [linkedRepoKey, options]);

  const selectedSource = linkedRepoKey.startsWith("github:") ? "github" : linkedRepoKey.startsWith("gitlab:") ? "gitlab" : null;

  // Close dropdown on outside click
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
    onLinkedRepoKeyChange(key);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onLinkedRepoKeyChange("");
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <label htmlFor="repo-search" className="shrink-0 text-xs font-medium text-(--sea-ink-soft)">
        Repository:
      </label>

      {linkedRepoKey ? (
        // Selected state — show chip with clear button
        <div className="flex flex-1 items-center gap-2 rounded-md border border-(--shore-line) bg-white px-2 py-1.5 dark:bg-[#1e1e1e]">
          {selectedSource === "github" ? (
            <Github size={14} className="shrink-0 text-(--sea-ink-soft)" />
          ) : selectedSource === "gitlab" ? (
            <Gitlab size={14} className="shrink-0 text-(--sea-ink-soft)" />
          ) : null}
          <span className="flex-1 truncate text-xs text-(--sea-ink)">
            {selectedLabel}
          </span>
          <button
            onClick={clear}
            className="shrink-0 rounded p-0.5 text-(--sea-ink-soft) hover:bg-(--foam) hover:text-(--sea-ink)"
            title="Remove linked repo"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        // Search state
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--sea-ink-soft)" />
          <input
            ref={inputRef}
            id="repo-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search repos and projects..."
            className="w-full rounded-md border border-(--shore-line) bg-white py-1.5 pl-8 pr-3 text-xs text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
          />

          {/* Dropdown */}
          {open && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-(--shore-line) bg-white shadow-lg dark:bg-[#1e1e1e]">
              {/* None option */}
              <button
                onClick={() => select("")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-(--sea-ink-soft) hover:bg-(--foam)"
              >
                None (advisory only)
              </button>

              {filtered.length === 0 && query.trim() && (
                <p className="px-3 py-2 text-xs text-(--sea-ink-soft)">
                  No repos matching &ldquo;{query}&rdquo;
                </p>
              )}

              {filtered.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => select(opt.key)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-(--sea-ink) hover:bg-(--foam)"
                >
                  {opt.source === "github" ? (
                    <Github size={14} className="shrink-0 text-(--sea-ink-soft)" />
                  ) : (
                    <Gitlab size={14} className="shrink-0 text-(--sea-ink-soft)" />
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
