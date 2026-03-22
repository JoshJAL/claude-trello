import { useState } from "react";
import type { AiProviderId } from "#/lib/providers/types";

const PROVIDER_CONFIG: Record<
  AiProviderId,
  { label: string; prefix: string; placeholder: string; consoleUrl: string; consoleName: string }
> = {
  claude: {
    label: "Anthropic (Claude) API Key",
    prefix: "sk-ant-api03-",
    placeholder: "sk-ant-api03-...",
    consoleUrl: "https://console.anthropic.com",
    consoleName: "console.anthropic.com",
  },
  openai: {
    label: "OpenAI API Key",
    prefix: "sk-",
    placeholder: "sk-...",
    consoleUrl: "https://platform.openai.com/api-keys",
    consoleName: "platform.openai.com",
  },
  groq: {
    label: "Groq API Key",
    prefix: "gsk_",
    placeholder: "gsk_...",
    consoleUrl: "https://console.groq.com/keys",
    consoleName: "console.groq.com",
  },
};

interface ApiKeyFormProps {
  providerId?: AiProviderId;
  hasKey: boolean;
  onSaved?: () => void;
}

export function ApiKeyForm({
  providerId = "claude",
  hasKey,
  onSaved,
}: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localOverride, setLocalOverride] = useState<boolean | null>(null);
  const saved = localOverride ?? hasKey;

  const config = PROVIDER_CONFIG[providerId];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!apiKey.startsWith(config.prefix)) {
      setError(`Key must start with ${config.prefix}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/settings/apikey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, providerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save key");
        return;
      }
      setApiKey("");
      setLocalOverride(true);
      onSaved?.();
    } catch {
      setError("Failed to save key");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/settings/apikey?providerId=${providerId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setError("Failed to remove key");
        return;
      }
      setLocalOverride(false);
      onSaved?.();
    } catch {
      setError("Failed to remove key");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {saved ? (
        <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-200 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
          <div className="flex items-center gap-2">
            <span className="text-green-900 dark:text-green-400">&#10003;</span>
            <span className="text-sm font-medium text-green-900 dark:text-green-300">
              API key saved
            </span>
          </div>
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
          >
            Remove
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label
            htmlFor={`apiKey-${providerId}`}
            className="text-sm font-medium text-[var(--sea-ink)]"
          >
            {config.label}
          </label>
          <input
            id={`apiKey-${providerId}`}
            type="password"
            required
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="rounded-lg border border-[var(--shore-line)] bg-white/60 px-3 py-2 text-sm text-[var(--sea-ink)] outline-none transition focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[var(--lagoon)]/20 dark:bg-white/5"
            placeholder={config.placeholder}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--lagoon)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save API Key"}
          </button>
        </form>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <p className="text-xs text-[var(--sea-ink-soft)]">
        Get your key from{" "}
        <a
          href={config.consoleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--lagoon)] hover:underline"
        >
          {config.consoleName}
        </a>
        . Your key is encrypted before storage and never displayed.
      </p>
    </div>
  );
}
