import { useState } from "react";

interface ConnectGitLabProps {
  isConnected: boolean;
  onStatusChange?: () => void;
}

export function ConnectGitLab({
  isConnected,
  onStatusChange,
}: ConnectGitLabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/gitlab/authorize");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed to get authorize URL (${res.status})`);
      if (!data.url) throw new Error("No authorize URL returned");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect GitLab");
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gitlab/connect", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      onStatusChange?.();
    } catch {
      setError("Failed to disconnect GitLab");
    } finally {
      setLoading(false);
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center justify-between rounded-md border border-green-300 bg-green-200 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
        <div className="flex items-center gap-2">
          <span className="text-green-900 dark:text-green-400">&#10003;</span>
          <span className="text-sm font-medium text-green-900 dark:text-green-300">
            GitLab connected
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
        className="flex items-center justify-center gap-2 rounded-md bg-[#FC6D26] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e5622a] disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect GitLab Account"}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
