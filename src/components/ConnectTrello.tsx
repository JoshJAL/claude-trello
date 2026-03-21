import { useState } from "react";

interface ConnectTrelloProps {
  isConnected: boolean;
  onConnected?: () => void;
}

export function ConnectTrello({ isConnected, onConnected }: ConnectTrelloProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/trello/authorize");
      if (!res.ok) throw new Error("Failed to get authorize URL");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setError("Failed to connect Trello");
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trello/connect", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      onConnected?.();
    } catch {
      setError("Failed to disconnect Trello");
    } finally {
      setLoading(false);
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-200 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
        <div className="flex items-center gap-2">
          <span className="text-green-900 dark:text-green-400">&#10003;</span>
          <span className="text-sm font-medium text-green-900 dark:text-green-300">
            Trello connected
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-lg bg-[#0079BF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#026AA7] disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect Trello Account"}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
