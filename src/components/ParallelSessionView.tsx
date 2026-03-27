import { useState } from "react";
import type { AgentStatus, ParallelSessionSummary } from "#/lib/types";
import type { SessionLogEntry } from "#/hooks/useClaudeSession";
import { AgentStatusRow } from "#/components/AgentStatusRow";

interface ParallelSessionViewProps {
  agents: Map<string, AgentStatus>;
  agentLogs: Map<string, SessionLogEntry[]>;
  summary: ParallelSessionSummary | null;
}

export function ParallelSessionView({
  agents,
  agentLogs,
  summary,
}: ParallelSessionViewProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const agentList = Array.from(agents.values());
  const selectedLogs = selectedCardId
    ? agentLogs.get(selectedCardId) ?? []
    : [];

  const completed = agentList.filter((a) => a.state === "completed").length;
  const failed = agentList.filter((a) => a.state === "failed").length;
  const running = agentList.filter((a) => a.state === "running").length;

  return (
    <div className="space-y-4">
      {/* Progress summary bar */}
      <div className="island-shell rounded-md p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-(--sea-ink)">
            Parallel Agents
          </span>
          <div className="flex gap-3 text-xs">
            {running > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                {running} running
              </span>
            )}
            {completed > 0 && (
              <span className="text-green-600 dark:text-green-400">
                {completed} completed
              </span>
            )}
            {failed > 0 && (
              <span className="text-red-600 dark:text-red-400">
                {failed} failed
              </span>
            )}
            <span className="text-(--sea-ink-soft)">
              {agentList.length} total
            </span>
          </div>
        </div>

        {agentList.length > 0 && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-(--shore-line)">
            <div
              className="h-full rounded-full bg-(--lagoon) transition-all"
              style={{
                width: `${((completed + failed) / agentList.length) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Agent grid + log panel */}
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Agent list */}
        <div className="space-y-2">
          {agentList.map((agent) => (
            <AgentStatusRow
              key={agent.cardId}
              status={agent}
              isSelected={selectedCardId === agent.cardId}
              onClick={() => setSelectedCardId(agent.cardId)}
            />
          ))}
        </div>

        {/* Log panel */}
        <div className="island-shell min-h-[300px] overflow-hidden rounded-md">
          {selectedCardId ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-(--shore-line) px-4 py-2">
                <span className="text-sm font-medium text-(--sea-ink)">
                  {agents.get(selectedCardId)?.cardName ?? "Agent"}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {selectedLogs.length === 0 ? (
                  <p className="text-sm text-(--sea-ink-soft)">
                    No output yet...
                  </p>
                ) : (
                  <div className="space-y-1 font-mono text-xs">
                    {selectedLogs.map((log) => (
                      <div
                        key={log.id}
                        className={
                          log.type === "error"
                            ? "text-red-600 dark:text-red-400"
                            : log.type === "tool"
                              ? "text-(--sea-ink-soft)"
                              : "text-(--sea-ink)"
                        }
                      >
                        {log.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <p className="text-sm text-(--sea-ink-soft)">
                Select an agent to view its output
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary panel */}
      {summary && (
        <div className="island-shell rounded-md p-4">
          <h3 className="text-sm font-semibold text-(--sea-ink)">
            Session Summary
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-(--sea-ink-soft)">
                Files Changed
              </p>
              <p className="text-lg font-semibold text-(--sea-ink)">
                {summary.diffStats.filesChanged}
              </p>
              <p className="text-xs text-(--sea-ink-soft)">
                +{summary.diffStats.insertions} / -{summary.diffStats.deletions}
              </p>
            </div>
            <div>
              <p className="text-xs text-(--sea-ink-soft)">Duration</p>
              <p className="text-lg font-semibold text-(--sea-ink)">
                {(summary.totalDurationMs / 1000).toFixed(1)}s
              </p>
            </div>
            <div>
              <p className="text-xs text-(--sea-ink-soft)">
                Integration Branch
              </p>
              <p className="truncate text-sm font-mono text-(--sea-ink)">
                {summary.integrationBranch}
              </p>
            </div>
          </div>

          {summary.mergeConflicts.length > 0 && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <p className="text-xs font-medium text-red-700 dark:text-red-300">
                Merge conflicts ({summary.mergeConflicts.length})
              </p>
              {summary.mergeConflicts.map((conflict) => (
                <div key={conflict.cardId} className="mt-1">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {agents.get(conflict.cardId)?.cardName ?? conflict.cardId}:
                  </p>
                  <ul className="ml-3 text-xs text-red-500">
                    {conflict.files.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
