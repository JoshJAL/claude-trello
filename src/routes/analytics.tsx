import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth.functions";
import {
  useAnalyticsSummary,
  useAnalyticsDaily,
  useAnalyticsProviders,
} from "#/hooks/useAnalytics";
import { PageSkeleton } from "#/components/PageSkeleton";
import {
  DollarSign,
  Zap,
  CheckSquare,
  BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/analytics")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  component: AnalyticsPage,
  pendingComponent: PageSkeleton,
});

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  subtext?: string;
}) {
  return (
    <div className="rounded-md border border-(--shore-line) bg-white/60 p-4 dark:bg-white/5">
      <div className="mb-1 flex items-center gap-2 text-(--sea-ink-soft)">
        <Icon size={16} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold text-(--sea-ink)">{value}</p>
      {subtext && (
        <p className="mt-0.5 text-xs text-(--sea-ink-soft)">{subtext}</p>
      )}
    </div>
  );
}

function BudgetBar({
  spent,
  budget,
}: {
  spent: number;
  budget: number;
}) {
  const pct = Math.min(100, (spent / budget) * 100);
  const isOver = pct >= 100;
  const isWarning = pct >= 80;

  return (
    <div className="rounded-md border border-(--shore-line) bg-white/60 p-4 dark:bg-white/5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-(--sea-ink-soft)">Monthly Budget</span>
        <span className="text-xs font-medium text-(--sea-ink)">
          {formatCents(spent)} / {formatCents(budget)}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-(--foam)">
        <div
          className={`h-full rounded-full transition-all ${
            isOver
              ? "bg-red-500"
              : isWarning
                ? "bg-amber-500"
                : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-(--sea-ink-soft)">
        {pct.toFixed(0)}% used
      </p>
    </div>
  );
}

function DailyChart({ days }: { days: Array<{ date: string; costCents: number }> }) {
  if (days.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-(--sea-ink-soft)">
        No spending data yet.
      </p>
    );
  }

  const maxCost = Math.max(...days.map((d) => d.costCents), 1);

  return (
    <div className="flex items-end gap-1" style={{ height: 120 }}>
      {days.map((day) => {
        const height = Math.max(2, (day.costCents / maxCost) * 100);
        return (
          <div
            key={day.date}
            className="group relative flex flex-1 flex-col items-center"
            style={{ height: "100%" }}
          >
            <div className="flex flex-1 items-end w-full">
              <div
                className="w-full rounded-t bg-(--lagoon) transition-all hover:opacity-80"
                style={{ height: `${height}%` }}
                title={`${day.date}: ${formatCents(day.costCents)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProviderBreakdown({
  providers,
}: {
  providers: Array<{ providerId: string; costCents: number; sessions: number }>;
}) {
  if (providers.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-(--sea-ink-soft)">
        No provider data yet.
      </p>
    );
  }

  const total = providers.reduce((s, p) => s + p.costCents, 0) || 1;
  const colors: Record<string, string> = {
    claude: "bg-purple-500",
    openai: "bg-green-500",
    groq: "bg-orange-500",
  };

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-4 overflow-hidden rounded-full bg-(--foam)">
        {providers.map((p) => (
          <div
            key={p.providerId}
            className={`${colors[p.providerId] ?? "bg-gray-400"}`}
            style={{ width: `${(p.costCents / total) * 100}%` }}
            title={`${p.providerId}: ${formatCents(p.costCents)}`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {providers.map((p) => (
          <div key={p.providerId} className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-sm ${colors[p.providerId] ?? "bg-gray-400"}`} />
            <span className="text-xs text-(--sea-ink)">
              {p.providerId} — {formatCents(p.costCents)} ({p.sessions} sessions)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: dailyData } = useAnalyticsDaily();
  const { data: providerData } = useAnalyticsProviders();

  if (summaryLoading) {
    return <PageSkeleton />;
  }

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="island-shell rounded-md p-8">
          <h1 className="mb-2 text-2xl font-bold text-(--sea-ink)">
            Usage & Analytics
          </h1>
          <p className="mb-6 text-sm text-(--sea-ink-soft)">
            {summary?.monthLabel ?? "This Month"}
          </p>

          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard
              label="Total Spend"
              value={formatCents(summary?.totalCostCents ?? 0)}
              icon={DollarSign}
            />
            <SummaryCard
              label="Sessions"
              value={String(summary?.sessionCount ?? 0)}
              icon={BarChart3}
              subtext={`avg ${formatCents(summary?.avgCostCentsPerSession ?? 0)}/session`}
            />
            <SummaryCard
              label="Tasks Done"
              value={String(summary?.tasksCompleted ?? 0)}
              icon={CheckSquare}
            />
            <SummaryCard
              label="Tokens"
              value={formatTokens((summary?.totalInputTokens ?? 0) + (summary?.totalOutputTokens ?? 0))}
              icon={Zap}
              subtext={`${formatTokens(summary?.totalInputTokens ?? 0)} in / ${formatTokens(summary?.totalOutputTokens ?? 0)} out`}
            />
          </div>

          {/* Budget bar */}
          {summary?.monthlyBudgetCents != null && (
            <div className="mb-6">
              <BudgetBar
                spent={summary.totalCostCents}
                budget={summary.monthlyBudgetCents}
              />
            </div>
          )}
        </div>

        {/* Daily spend chart */}
        <div className="island-shell rounded-md p-6">
          <h2 className="mb-4 text-sm font-semibold text-(--sea-ink)">
            Daily Spend (Last 30 Days)
          </h2>
          <DailyChart days={dailyData?.days ?? []} />
        </div>

        {/* Provider breakdown */}
        <div className="island-shell rounded-md p-6">
          <h2 className="mb-4 text-sm font-semibold text-(--sea-ink)">
            Spend by Provider
          </h2>
          <ProviderBreakdown providers={providerData?.providers ?? []} />
        </div>
      </div>
    </main>
  );
}
