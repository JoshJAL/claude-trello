import { useState, useCallback, useRef } from "react";
import type { BoardData } from "#/lib/types";
import type { AiProviderId } from "#/lib/providers/types";
import { generateEditDiff, generateWriteDiff, type FileDiff } from "#/lib/diff";

export interface SessionLogEntry {
  id: number;
  type: string;
  content: string;
  timestamp: number;
  diff?: FileDiff;
}

export function useClaudeSession(boardId: string) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<SessionLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const idCounter = useRef(0);
  const pendingToolInputs = useRef<Map<string, Record<string, unknown>>>(new Map());

  const addLog = useCallback((type: string, content: string, diff?: FileDiff) => {
    setLogs((prev) => [
      ...prev,
      {
        id: idCounter.current++,
        type,
        content,
        timestamp: Date.now(),
        diff,
      },
    ]);
  }, []);

  const start = useCallback(
    async (
      boardData: BoardData,
      cwd: string,
      userMessage?: string,
      options?: {
        providerId?: AiProviderId;
        source?: "trello" | "github" | "gitlab";
        githubOwner?: string;
        githubRepo?: string;
        gitlabProjectId?: number;
        webMode?: boolean;
      },
    ) => {
      setIsRunning(true);
      setError(null);
      setLogs([]);
      setPendingQuestion(null);
      idCounter.current = 0;

      try {
        const res = await fetch("/api/claude/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boardData,
            cwd: options?.webMode ? undefined : cwd,
            userMessage,
            providerId: options?.providerId,
            source: options?.source,
            githubOwner: options?.githubOwner,
            githubRepo: options?.githubRepo,
            gitlabProjectId: options?.gitlabProjectId,
            webMode: options?.webMode,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to start session");
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
              const message = JSON.parse(json);

              if (message.type === "done") {
                addLog("system", "Session complete");
                streamEnded = true;
                break;
              }

              if (message.type === "error") {
                setError(message.error);
                addLog("error", message.error);
                streamEnded = true;
                break;
              }

              if (message.type === "assistant") {
                // Web mode: AgentMessage format — content is a string
                if (typeof message.content === "string") {
                  addLog("assistant", message.content);
                }
                // Local mode: raw Claude Agent SDK format — content is an array
                const content = message.message?.content ?? message.raw?.message?.content;
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
                        const toolName = block.name;
                        const toolInput = block.input ?? {};
                        
                        // Store tool input for potential diff generation
                        pendingToolInputs.current.set(toolName, toolInput);
                        
                        addLog(
                          "tool",
                          `Using tool: ${toolName}(${JSON.stringify(toolInput)})`,
                        );
                      }
                    }
                  }
                }
              } else if (message.type === "tool_use") {
                // Web mode tool use events
                const toolName = message.toolName;
                const toolInput = message.toolInput ?? {};
                
                // Store tool input for potential diff generation
                if (toolName) {
                  pendingToolInputs.current.set(toolName, toolInput);
                }
                
                addLog(
                  "tool",
                  `Using tool: ${toolName}(${JSON.stringify(toolInput)})`,
                );
              } else if (message.type === "tool_result") {
                // Web mode tool result events — show result and generate diff if applicable
                const result = message.toolResult ?? "";
                const toolName = message.toolName;
                const toolInput = toolName ? pendingToolInputs.current.get(toolName) : undefined;
                
                let diff: FileDiff | undefined;
                
                // Generate diff for file operations
                if (toolName && toolInput && (toolName === "write_file" || toolName === "edit_file")) {
                  const filePath = toolInput.path as string;
                  
                  if (toolName === "edit_file" && toolInput.old_text && toolInput.new_text) {
                    diff = generateEditDiff(
                      filePath,
                      toolInput.old_text as string,
                      toolInput.new_text as string
                    );
                  } else if (toolName === "write_file" && toolInput.content) {
                    // For write_file, we assume it's either a new file or a rewrite
                    // We can't know for sure without the original content, so we'll show as new
                    diff = generateWriteDiff(
                      filePath,
                      toolInput.content as string,
                      !result.includes("branch:") // Heuristic: if branch mentioned, likely existing file
                    );
                  }
                }
                
                // Clean up tool input after use
                if (toolName) {
                  pendingToolInputs.current.delete(toolName);
                }
                
                const truncated = result.length > 200
                  ? result.slice(0, 200) + "..."
                  : result;
                addLog("result", `[${toolName}] ${truncated}`, diff);
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
