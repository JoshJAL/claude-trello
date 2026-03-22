import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ConnectTrello } from "#/components/ConnectTrello";
import { ConnectGitHub } from "#/components/ConnectGitHub";
import { ConnectGitLab } from "#/components/ConnectGitLab";
import { PrAutomationSettings } from "#/components/PrAutomationSettings";
import { ApiKeyForm } from "#/components/ApiKeyForm";
import { PageSkeleton } from "#/components/PageSkeleton";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { useBudget, useUpdateBudget } from "#/hooks/useAnalytics";
import { getSession } from "#/lib/auth.functions";
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
  const { trelloLinked, githubLinked, gitlabLinked, configuredProviders, refetch } =
    useIntegrationStatus();

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold text-(--sea-ink)">
          Settings
        </h1>

        <section className="island-shell mb-6 rounded-2xl p-6">
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

        <section className="island-shell rounded-2xl p-6">
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

        <section className="island-shell mt-6 rounded-2xl p-6">
          <h2 className="mb-2 text-lg font-semibold text-(--sea-ink)">
            PR Automation
          </h2>
          <p className="mb-4 text-sm text-(--sea-ink-soft)">
            Automatically create pull requests after AI sessions complete.
          </p>
          <PrAutomationSettings />
        </section>

        <BudgetSection />
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
    <section className="island-shell mt-6 rounded-2xl p-6">
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
                className="w-full rounded-lg border border-(--shore-line) bg-white/60 py-2 pl-7 pr-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-white/5"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={updateBudget.isPending}
              className="rounded-lg bg-(--lagoon) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
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
