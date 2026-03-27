import { useEffect, useRef, useState } from "react";
import type { SessionLogEntry } from "#/hooks/useClaudeSession";
import { DiffViewer } from "./DiffViewer";

interface SessionLogProps {
  logs: SessionLogEntry[];
  isRunning: boolean;
  pendingQuestion: string | null;
  onSendMessage: (message: string) => void;
  providerLabel?: string;
}

const typeStyles: Record<string, string> = {
  assistant: "text-(--sea-ink)",
  tool: "text-blue-600 dark:text-blue-400",
  system: "text-(--sea-ink-soft) italic",
  result: "text-green-900 dark:text-green-400 font-medium",
  error: "text-red-600 dark:text-red-400",
  question:
    "text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1 border border-amber-200 dark:border-amber-800",
  user: "text-(--lagoon) font-medium",
  pr: "text-purple-700 dark:text-purple-300 font-medium bg-purple-50 dark:bg-purple-950/30 rounded px-2 py-1 border border-purple-200 dark:border-purple-800",
};

export function SessionLog({
  logs,
  isRunning,
  pendingQuestion,
  onSendMessage,
  providerLabel = "the agent",
}: SessionLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logs.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg) return;
    onSendMessage(msg);
    setInput("");
  }

  if (logs.length === 0 && !isRunning) {
    return null;
  }

  return (
    <div className="island-shell rounded-md p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-(--sea-ink)">
          Session Log
        </h3>
        {isRunning && (
          <span className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide bg-green-200 text-green-900 dark:bg-green-900/40 dark:text-green-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-sm bg-green-500" />
            Running
          </span>
        )}
        {pendingQuestion && (
          <span className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            Waiting for your reply
          </span>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        className="max-h-[calc(100vh-18rem)] min-h-48 space-y-1.5 overflow-y-auto rounded-md bg-(--foam) p-3 font-mono text-xs"
      >
        {logs.map((entry) => (
          <div key={entry.id} className={typeStyles[entry.type] ?? ""}>
            <span className="mr-2 text-(--sea-ink-soft)">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            {entry.type === "user" && (
              <span className="mr-1 text-(--sea-ink-soft)">You:</span>
            )}
            <span className="whitespace-pre-wrap break-words">
              {entry.content}
            </span>
            {entry.diff && <DiffViewer diff={entry.diff} />}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Chat input — always visible while session is running */}
      {isRunning && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              pendingQuestion
                ? "Type your answer..."
                : `Send a message to ${providerLabel}...`
            }
            className={`flex-1 rounded-md border px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:ring-2 dark:bg-white/5 ${
              pendingQuestion
                ? "border-amber-300 bg-amber-50/50 focus:border-amber-400 focus:ring-amber-200/40 dark:border-amber-700 dark:bg-amber-950/20"
                : "border-(--shore-line) bg-white/60 focus:border-(--lagoon) focus:ring-(--lagoon)/20"
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="shrink-0 rounded-md bg-(--lagoon) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
