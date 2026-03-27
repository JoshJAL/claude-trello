import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PrAutomationConfig } from "#/lib/types";
import { DEFAULT_PR_AUTOMATION_CONFIG } from "#/lib/types";

/**
 * Generate a branch name preview from the pattern.
 * Client-safe version of the utility in pr.ts.
 */
function previewBranchName(
  pattern: string,
  source: string,
  id: string,
  title: string,
): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return pattern
    .replace("{source}", source)
    .replace("{id}", id)
    .replace("{slug}", slug);
}

async function fetchAutomationConfig(): Promise<PrAutomationConfig> {
  const res = await fetch("/api/settings/automation");
  if (!res.ok) throw new Error("Failed to fetch automation config");
  return res.json();
}

async function updateAutomationConfig(
  config: PrAutomationConfig,
): Promise<void> {
  const res = await fetch("/api/settings/automation", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to update automation config");
}

export function PrAutomationSettings() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["settings", "automation"],
    queryFn: fetchAutomationConfig,
  });

  const [localConfig, setLocalConfig] = useState<PrAutomationConfig>(
    () => config ?? DEFAULT_PR_AUTOMATION_CONFIG,
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Sync when server data loads (only on first load, not on every refetch)
  const configLoaded = !!config;
  const [synced, setSynced] = useState(false);
  if (configLoaded && !synced) {
    setLocalConfig(config);
    setSynced(true);
  }

  const mutation = useMutation({
    mutationFn: updateAutomationConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "automation"] });
      setHasChanges(false);
    },
  });

  const updateField = useCallback(
    <K extends keyof PrAutomationConfig>(
      field: K,
      value: PrAutomationConfig[K],
    ) => {
      setLocalConfig((prev) => ({ ...prev, [field]: value }));
      setHasChanges(true);
    },
    [],
  );

  const handleSave = () => {
    mutation.mutate(localConfig);
  };

  // Generate a preview of the branch name
  const branchPreview = previewBranchName(
    localConfig.branchNamingPattern,
    "github",
    "42",
    "Fix login page styling",
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 rounded bg-(--sea-sand) w-3/4" />
        <div className="h-4 rounded bg-(--sea-sand) w-1/2" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enable/Disable toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={localConfig.enabled}
          onChange={(e) => updateField("enabled", e.target.checked)}
          className="h-4 w-4 rounded border-(--sea-ink-soft) text-(--sea-accent) focus:ring-(--sea-accent)"
        />
        <span className="text-sm font-medium text-(--sea-ink)">
          Automatically create PR/MR after sessions complete
        </span>
      </label>

      {localConfig.enabled && (
        <div className="ml-7 space-y-4">
          {/* Draft PR */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localConfig.autoDraft}
              onChange={(e) => updateField("autoDraft", e.target.checked)}
              className="h-4 w-4 rounded border-(--sea-ink-soft) text-(--sea-accent) focus:ring-(--sea-accent)"
            />
            <span className="text-sm text-(--sea-ink)">
              Create as draft PR/MR
            </span>
          </label>

          {/* Auto-link issues */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localConfig.autoLinkIssue}
              onChange={(e) => updateField("autoLinkIssue", e.target.checked)}
              className="h-4 w-4 rounded border-(--sea-ink-soft) text-(--sea-accent) focus:ring-(--sea-accent)"
            />
            <span className="text-sm text-(--sea-ink)">
              Add &ldquo;Closes #N&rdquo; to PR body
            </span>
          </label>

          {/* Branch naming pattern */}
          <div>
            <label htmlFor="branch-pattern" className="block text-sm font-medium text-(--sea-ink) mb-1">
              Branch naming pattern
            </label>
            <input
              id="branch-pattern"
              type="text"
              value={localConfig.branchNamingPattern}
              onChange={(e) =>
                updateField("branchNamingPattern", e.target.value)
              }
              placeholder={DEFAULT_PR_AUTOMATION_CONFIG.branchNamingPattern}
              className="w-full rounded-md border border-(--sea-ink-soft) bg-(--sea-bg) px-3 py-2 text-sm text-(--sea-ink) placeholder:text-(--sea-ink-soft) focus:border-(--sea-accent) focus:outline-none focus:ring-1 focus:ring-(--sea-accent)"
            />
            <p className="mt-1 text-xs text-(--sea-ink-soft)">
              Variables: {"{source}"}, {"{id}"}, {"{slug}"}
            </p>
            <p className="mt-1 text-xs text-(--sea-ink-soft)">
              Preview:{" "}
              <code className="rounded bg-(--sea-sand) px-1 py-0.5 font-mono">
                {branchPreview}
              </code>
            </p>
          </div>
        </div>
      )}

      {/* Save button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="rounded-md bg-(--sea-accent) px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving..." : "Save"}
        </button>
      )}

      {mutation.isError && (
        <p className="text-sm text-red-500">
          Failed to save. Please try again.
        </p>
      )}

      {mutation.isSuccess && !hasChanges && (
        <p className="text-sm text-green-600">Settings saved.</p>
      )}
    </div>
  );
}
