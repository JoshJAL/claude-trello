import { useState, useRef, useEffect, useMemo } from "react";
import { GitBranch, X, Search } from "lucide-react";

interface BranchSelectorProps {
  branches: string[];
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  isLoading?: boolean;
}

export function BranchSelector({
  branches,
  selectedBranch,
  onBranchChange,
  isLoading,
}: BranchSelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return branches;
    const q = query.toLowerCase();
    return branches.filter((b) => b.toLowerCase().includes(q));
  }, [branches, query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(branch: string) {
    onBranchChange(branch);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onBranchChange("");
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <label
        htmlFor="branch-search"
        className="shrink-0 text-xs font-medium text-(--sea-ink-soft)"
      >
        Branch:
      </label>

      {selectedBranch ? (
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-(--shore-line) bg-white px-2 py-1.5 dark:bg-[#1e1e1e]">
          <GitBranch size={14} className="shrink-0 text-(--sea-ink-soft)" />
          <span className="flex-1 truncate text-xs text-(--sea-ink)">
            {selectedBranch}
          </span>
          <button
            onClick={clear}
            className="shrink-0 rounded p-0.5 text-(--sea-ink-soft) hover:bg-(--foam) hover:text-(--sea-ink)"
            title="Use auto-generated branch"
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
            id="branch-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={
              isLoading ? "Loading branches..." : "Search branches..."
            }
            disabled={isLoading}
            className="w-full rounded-lg border border-(--shore-line) bg-white py-1.5 pl-8 pr-3 text-xs text-(--sea-ink) outline-none focus:border-(--lagoon) disabled:opacity-50 dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
          />

          {open && !isLoading && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-(--shore-line) bg-white shadow-lg dark:bg-[#1e1e1e]">
              {/* Default option: auto-generate new branch */}
              <button
                onClick={() => select("")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-(--sea-ink-soft) hover:bg-(--foam)"
              >
                Auto-generate new branch
              </button>

              {filtered.length === 0 && query.trim() && (
                <p className="px-3 py-2 text-xs text-(--sea-ink-soft)">
                  No branches matching &ldquo;{query}&rdquo;
                </p>
              )}

              {filtered.map((branch) => (
                <button
                  key={branch}
                  onClick={() => select(branch)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-(--sea-ink) hover:bg-(--foam)"
                >
                  <GitBranch
                    size={14}
                    className="shrink-0 text-(--sea-ink-soft)"
                  />
                  <span className="truncate">{branch}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
