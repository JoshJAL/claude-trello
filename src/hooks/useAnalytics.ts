import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AnalyticsSummary {
  totalCostCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  sessionCount: number;
  tasksCompleted: number;
  avgCostCentsPerSession: number;
  monthlyBudgetCents: number | null;
  budgetAlertThreshold: number;
  monthLabel: string;
}

export interface DailyData {
  date: string;
  costCents: number;
  sessions: number;
}

export interface ProviderData {
  providerId: string;
  costCents: number;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
}

export interface BudgetSettings {
  monthlyBudgetCents: number | null;
  budgetAlertThreshold: number;
}

async function fetchSummary(): Promise<AnalyticsSummary> {
  const res = await fetch("/api/analytics/summary");
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

async function fetchDaily(): Promise<{ days: DailyData[] }> {
  const res = await fetch("/api/analytics/daily");
  if (!res.ok) throw new Error("Failed to fetch daily data");
  return res.json();
}

async function fetchProviders(): Promise<{ providers: ProviderData[] }> {
  const res = await fetch("/api/analytics/providers");
  if (!res.ok) throw new Error("Failed to fetch provider data");
  return res.json();
}

async function fetchBudget(): Promise<BudgetSettings> {
  const res = await fetch("/api/settings/budget");
  if (!res.ok) throw new Error("Failed to fetch budget");
  return res.json();
}

async function updateBudget(settings: { monthlyBudgetCents: number | null; budgetAlertThreshold?: number }): Promise<void> {
  const res = await fetch("/api/settings/budget", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to update budget");
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: fetchSummary,
  });
}

export function useAnalyticsDaily() {
  return useQuery({
    queryKey: ["analytics", "daily"],
    queryFn: fetchDaily,
  });
}

export function useAnalyticsProviders() {
  return useQuery({
    queryKey: ["analytics", "providers"],
    queryFn: fetchProviders,
  });
}

export function useBudget() {
  return useQuery({
    queryKey: ["settings", "budget"],
    queryFn: fetchBudget,
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBudget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings", "budget"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] });
    },
  });
}
