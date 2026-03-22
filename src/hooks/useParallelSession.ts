import { useState, useCallback, useRef } from "react";
import type {
  BoardData,
  AgentStatus,
  ParallelSessionSummary,
  ParallelEvent,
} from "#/lib/types";
import type { SessionLogEntry } from "#/hooks/useClaudeSession";
import type { AiProviderId } from "#/lib/providers/types";

export function useParallelSession(boardId: string) {
  const [isRunning, setIsRunning] = useState(false);
  const [agents, setAgents] = useState<Map<string, AgentStatus>>(new Map());
  const [agentLogs, setAgentLogs] = useState<Map<string, SessionLogEntry[]>>(
    new Map(),
  );
  const [summary, setSummary] = useState<ParallelSessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idCounter = useRef(0);

  const addAgentLog = useCallback(
    (cardId: string, type: string, content: string) => {
      setAgentLogs((prev) => {
        const next = new Map(prev);
        const logs = next.get(cardId) ?? [];
        next.set(cardId, [
          ...logs,
          {
            id: idCounter.current++,
            type,
            content,
            timestamp: Date.now(),
          },
        ]);
        return next;
      });
    },
    [],
  );

  const updateAgent = useCallback(
    (cardId: string, update: Partial<AgentStatus>) => {
      setAgents((prev) => {
        const next = new Map(prev);
        const existing = next.get(cardId);
        if (existing) {
          next.set(cardId, { ...existing, ...update });
        }
        return next;
      });
    },
    [],
  );

  const start = useCallback(
    async (
      boardData: BoardData,
      cwd: string,
      maxConcurrency: number,
      userMessage?: string,
      options?: {
        providerId?: AiProviderId;
        source?: "trello" | "github" | "gitlab";
        githubOwner?: string;
        githubRepo?: string;
        gitlabProjectId?: number;
      },
    ) => {
      setIsRunning(true);
      setError(null);
      setAgents(new Map());
      setAgentLogs(new Map());
      setSummary(null);
      idCounter.current = 0;

      try {
        const res = await fetch("/api/claude/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boardData,
            cwd,
            userMessage,
            mode: "parallel",
            maxConcurrency,
            providerId: options?.providerId,
            source: options?.source,
            githubOwner: options?.githubOwner,
            githubRepo: options?.githubRepo,
            gitlabProjectId: options?.gitlabProjectId,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to start parallel session");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let streamEnded = false;

        while (!streamEnded) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const dataLine = line.trim();
            if (!dataLine.startsWith("data: ")) continue;

            const json = dataLine.slice(6);
            try {
              const event = JSON.parse(json) as
                | ParallelEvent
                | { type: "done" }
                | { type: "error"; error: string };

              if (event.type === "done") {
                streamEnded = true;
                break;
              }

              if (event.type === "error") {
                setError((event as { error: string }).error);
                streamEnded = true;
                break;
              }

              handleParallelEvent(event as ParallelEvent);
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
      } finally {
        setIsRunning(false);
      }
    },
    [boardId],
  );

  function handleParallelEvent(event: ParallelEvent) {
    switch (event.type) {
      case "agent_queued":
        setAgents((prev) => {
          const next = new Map(prev);
          next.set(event.cardId, {
            cardId: event.cardId,
            cardName: event.cardName,
            state: "queued",
            checklistTotal: 0,
            checklistDone: 0,
          });
          return next;
        });
        break;

      case "agent_started":
        updateAgent(event.cardId, {
          state: "running",
          branch: event.branch,
          worktreePath: event.worktreePath,
        });
        addAgentLog(
          event.cardId,
          "system",
          `Started in ${event.worktreePath}`,
        );
        break;

      case "agent_message": {
        const msg = event.message as {
          type: string;
          message?: { content?: Array<{ type: string; text?: string; name?: string }> };
        };
        if (msg.type === "assistant" && Array.isArray(msg.message?.content)) {
          for (const block of msg.message!.content) {
            if (block.type === "text" && block.text) {
              addAgentLog(event.cardId, "assistant", block.text);
            } else if (block.type === "tool_use" && block.name) {
              addAgentLog(event.cardId, "tool", `[${block.name}]`);
            }
          }
        }
        break;
      }

      case "agent_completed":
        updateAgent(event.cardId, event.status);
        addAgentLog(event.cardId, "system", "Completed");
        break;

      case "agent_failed":
        updateAgent(event.cardId, { state: "failed", error: event.error });
        addAgentLog(event.cardId, "error", event.error);
        break;

      case "merge_started":
        updateAgent(event.cardId, { state: "merging" });
        addAgentLog(event.cardId, "system", "Merging...");
        break;

      case "merge_completed":
        if (event.success) {
          addAgentLog(event.cardId, "system", "Merged successfully");
        } else {
          updateAgent(event.cardId, { state: "conflict" });
          addAgentLog(
            event.cardId,
            "error",
            `Merge conflicts: ${event.conflicts?.join(", ")}`,
          );
        }
        break;

      case "summary":
        setSummary(event.summary);
        // Update agent statuses from summary
        for (const agent of event.summary.agents) {
          updateAgent(agent.cardId, agent);
        }
        break;
    }
  }

  const stop = useCallback(async () => {
    try {
      await fetch("/api/claude/session", { method: "DELETE" });
    } catch {
      // Best effort
    }
    setIsRunning(false);
  }, []);

  return { isRunning, agents, agentLogs, summary, error, start, stop };
}
