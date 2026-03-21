import { useState, useCallback, useRef } from "react";
import type { BoardData } from "#/lib/types";

export interface SessionLogEntry {
  id: number;
  type: string;
  content: string;
  timestamp: number;
}

export function useClaudeSession(boardId: string) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<SessionLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const idCounter = useRef(0);

  const addLog = useCallback((type: string, content: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: idCounter.current++,
        type,
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const start = useCallback(
    async (boardData: BoardData, cwd: string) => {
      setIsRunning(true);
      setError(null);
      setLogs([]);
      setPendingQuestion(null);
      idCounter.current = 0;

      try {
        const res = await fetch("/api/claude/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boardData, cwd }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to start session");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
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
              const message = JSON.parse(json);

              if (message.type === "done") {
                addLog("system", "Session complete");
                break;
              }

              if (message.type === "error") {
                setError(message.error);
                addLog("error", message.error);
                break;
              }

              if (message.type === "assistant") {
                const content = message.message?.content;
                if (Array.isArray(content)) {
                  for (const block of content) {
                    if (block.type === "text") {
                      addLog("assistant", block.text);
                    } else if (block.type === "tool_use") {
                      if (block.name === "AskUserQuestion") {
                        // Extract the question text
                        const questions = block.input?.questions;
                        if (Array.isArray(questions) && questions.length > 0) {
                          const questionText = questions
                            .map(
                              (q: { question: string }) => q.question,
                            )
                            .join("\n");
                          addLog("question", questionText);
                          setPendingQuestion(questionText);
                        }
                      } else {
                        addLog(
                          "tool",
                          `Using tool: ${block.name}(${JSON.stringify(block.input)})`,
                        );
                      }
                    }
                  }
                }
              } else if (message.type === "result") {
                addLog(
                  "result",
                  `Session finished: ${message.result ?? message.subtype}`,
                );
              } else if (
                message.type === "system" &&
                message.subtype === "init"
              ) {
                addLog("system", `Session started (model: ${message.model})`);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        addLog("error", msg);
      } finally {
        setIsRunning(false);
        setPendingQuestion(null);
      }
    },
    [boardId, addLog],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      setPendingQuestion(null);
      addLog("user", message);

      try {
        const res = await fetch("/api/claude/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        if (!res.ok) {
          const data = await res.json();
          addLog("error", data.error ?? "Failed to send message");
        }
      } catch {
        addLog("error", "Failed to send message");
      }
    },
    [addLog],
  );

  const stop = useCallback(async () => {
    try {
      await fetch("/api/claude/session", { method: "DELETE" });
    } catch {
      // Best effort
    }
    setIsRunning(false);
    setPendingQuestion(null);
  }, []);

  return { isRunning, logs, error, pendingQuestion, start, stop, sendMessage };
}
