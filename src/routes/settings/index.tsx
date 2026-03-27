import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ConnectTrello } from "#/components/ConnectTrello";
import { ConnectGitHub } from "#/components/ConnectGitHub";
import { ConnectGitLab } from "#/components/ConnectGitLab";
import { ConnectGoogleDrive } from "#/components/ConnectGoogleDrive";
import { ConnectOneDrive } from "#/components/ConnectOneDrive";
import { PrAutomationSettings } from "#/components/PrAutomationSettings";
import { ApiKeyForm } from "#/components/ApiKeyForm";
import { PageSkeleton } from "#/components/PageSkeleton";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { useBudget, useUpdateBudget } from "#/hooks/useAnalytics";
import { getSession } from "#/lib/auth.functions";
import { signOut } from "#/lib/auth-client";
import type { AiProviderId } from "#/lib/providers/types";

export const Route = createFileRoute("/settings/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  component: SettingsPage,
  pendingComponent: PageSkeleton,
});

const PROVIDERS: Array<{ id: AiProviderId; label: string }> = [
  { id: "claude", label: "Anthropic (Claude)" },
  { id: "openai", label: "OpenAI (ChatGPT)" },
  { id: "groq", label: "Groq" },
];

function SettingsPage() {
  const { trelloLinked, githubLinked, gitlabLinked, googleDriveLinked, oneDriveLinked, configuredProviders, refetch } =
    useIntegrationStatus();

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold text-(--sea-ink)">
          Settings
        </h1>

        <section className="island-shell mb-6 rounded-md p-6">
          <h2 className="mb-4 text-lg font-semibold text-(--sea-ink)">
            Task Sources
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                Trello
              </h3>
              <ConnectTrello
                isConnected={trelloLinked}
                onStatusChange={() => refetch()}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                GitHub
              </h3>
              <ConnectGitHub
                isConnected={githubLinked}
                onStatusChange={() => refetch()}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                GitLab
              </h3>
              <ConnectGitLab
                isConnected={gitlabLinked}
                onStatusChange={() => refetch()}
              />
            </div>
          </div>
        </section>

        <section className="island-shell mb-6 rounded-md p-6">
          <h2 className="mb-4 text-lg font-semibold text-(--sea-ink)">
            Workspaces
          </h2>
          <p className="mb-4 text-sm text-(--sea-ink-soft)">
            Connect cloud storage to use as a workspace for AI agents. Agents
            can read, write, and edit files — including spreadsheets — directly
            in your connected storage.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                Google Drive
              </h3>
              <ConnectGoogleDrive
                isConnected={googleDriveLinked}
                onStatusChange={() => refetch()}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                OneDrive
              </h3>
              <ConnectOneDrive
                isConnected={oneDriveLinked}
                onStatusChange={() => refetch()}
              />
            </div>
          </div>
        </section>

        <section className="island-shell rounded-md p-6">
          <h2 className="mb-2 text-lg font-semibold text-(--sea-ink)">
            AI Providers
          </h2>
          <p className="mb-4 text-sm text-(--sea-ink-soft)">
            Configure at least one AI provider to start sessions. You can use
            different providers for different boards.
          </p>
          <div className="space-y-5">
            {PROVIDERS.map((provider) => (
              <div key={provider.id}>
                <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                  {provider.label}
                </h3>
                <ApiKeyForm
                  providerId={provider.id}
                  hasKey={configuredProviders.includes(provider.id)}
                  onSaved={() => refetch()}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="island-shell mt-6 rounded-md p-6">
          <h2 className="mb-2 text-lg font-semibold text-(--sea-ink)">
            PR Automation
          </h2>
          <p className="mb-4 text-sm text-(--sea-ink-soft)">
            Automatically create pull requests after AI sessions complete.
          </p>
          <PrAutomationSettings />
        </section>

        <BudgetSection />

        <DeleteAccountSection />
      </div>
    </main>
  );
}

function BudgetSection() {
  const { data: budget, isLoading } = useBudget();
  const updateBudget = useUpdateBudget();
  const [budgetInput, setBudgetInput] = useState("");
  const [threshold, setThreshold] = useState(80);
  const [synced, setSynced] = useState(false);

  if (budget && !synced) {
    setBudgetInput(
      budget.monthlyBudgetCents !== null
        ? (budget.monthlyBudgetCents / 100).toFixed(2)
        : "",
    );
    setThreshold(budget.budgetAlertThreshold);
    setSynced(true);
  }

  const handleSave = () => {
    const dollars = parseFloat(budgetInput);
    const cents = budgetInput.trim() === "" ? null : Math.round(dollars * 100);
    if (cents !== null && (isNaN(cents) || cents < 0)) return;
    updateBudget.mutate({ monthlyBudgetCents: cents, budgetAlertThreshold: threshold });
  };

  const handleRemove = () => {
    setBudgetInput("");
    updateBudget.mutate({ monthlyBudgetCents: null });
  };

  if (isLoading) return null;

  return (
    <section className="island-shell mt-6 rounded-md p-6">
      <h2 className="mb-2 text-lg font-semibold text-(--sea-ink)">
        Budget
      </h2>
      <p className="mb-4 text-sm text-(--sea-ink-soft)">
        Set a monthly spending limit. Sessions will be blocked when the limit is reached.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="monthly-budget" className="mb-1 block text-xs font-medium text-(--sea-ink-soft)">
            Monthly Limit (USD)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-(--sea-ink-soft)">$</span>
              <input
                id="monthly-budget"
                type="number"
                min="0"
                step="0.01"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="No limit"
                className="w-full rounded-md border border-(--shore-line) bg-white/60 py-2 pl-7 pr-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-white/5"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={updateBudget.isPending}
              className="rounded-md bg-(--lagoon) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="budget-threshold" className="mb-1 block text-xs font-medium text-(--sea-ink-soft)">
            Alert Threshold: {threshold}%
          </label>
          <input
            id="budget-threshold"
            type="range"
            min="10"
            max="100"
            step="5"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full"
          />
          <p className="mt-1 text-xs text-(--sea-ink-soft)">
            You&apos;ll see a warning when spending reaches this percentage of your limit.
          </p>
        </div>

        {budget?.monthlyBudgetCents !== null && (
          <button
            onClick={handleRemove}
            disabled={updateBudget.isPending}
            className="text-sm text-red-600 hover:underline dark:text-red-400"
          >
            Remove budget limit
          </button>
        )}
      </div>
    </section>
  );
}

function DeleteAccountSection() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (confirmText !== "delete my account") return;
    setDeleting(true);
    setError("");

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to delete account");
      }
      await signOut();
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  }

  return (
    <section className="island-shell mt-6 rounded-md border border-red-200 p-6 dark:border-red-900/40">
      <h2 className="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">
        Danger Zone
      </h2>
      <p className="mb-4 text-sm text-(--sea-ink-soft)">
        Permanently delete your account and all associated data. This includes
        session history, API keys, OAuth connections, and settings. This action
        cannot be undone.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          Delete account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-(--sea-ink)">
            Type <span className="font-mono text-red-600 dark:text-red-400">delete my account</span> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete my account"
            className="w-full rounded-md border border-red-300 bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-red-800 dark:bg-white/5"
            disabled={deleting}
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={confirmText !== "delete my account" || deleting}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Permanently delete my account"}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
                setError("");
              }}
              disabled={deleting}
              className="rounded-md border border-(--shore-line) px-4 py-2 text-sm text-(--sea-ink) transition hover:bg-(--foam) disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
