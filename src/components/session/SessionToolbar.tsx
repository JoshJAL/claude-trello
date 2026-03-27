import { PROVIDER_SHORT_LABELS, PROVIDER_MODELS } from "#/lib/providers/types";
import type { AiProviderId } from "#/lib/providers/types";

interface SessionToolbarProps {
  configuredProviders: AiProviderId[];
  providerId: AiProviderId;
  onProviderChange: (id: AiProviderId) => void;
  isDeployed: boolean;
  webMode: boolean;
  onWebModeChange: (web: boolean) => void;
  mode: "sequential" | "parallel";
  onModeChange: (mode: "sequential" | "parallel") => void;
  concurrency: number;
  onConcurrencyChange: (n: number) => void;
  activeCardCount?: number;
  modelId: string;
  onModelChange: (id: string) => void;
}

function ToggleGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-(--sea-ink-soft)">{label}:</span>
      <div className="inline-flex rounded-md border border-(--shore-line) p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              value === opt.value
                ? "bg-(--lagoon) text-white"
                : "text-(--sea-ink-soft) hover:text-(--sea-ink)"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SessionToolbar({
  configuredProviders,
  providerId,
  onProviderChange,
  isDeployed,
  webMode,
  onWebModeChange,
  mode,
  onModeChange,
  concurrency,
  onConcurrencyChange,
  activeCardCount,
  modelId,
  onModelChange,
}: SessionToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {configuredProviders.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-(--sea-ink-soft)">AI:</span>
          <select
            value={providerId}
            onChange={(e) => onProviderChange(e.target.value as AiProviderId)}
            className="rounded-md border border-(--shore-line) bg-white px-2 py-1 text-xs text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
          >
            {configuredProviders.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_SHORT_LABELS[p] ?? p}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-(--sea-ink-soft)">Model:</span>
        <select
          value={modelId}
          onChange={(e) => onModelChange(e.target.value)}
          className="rounded-md border border-(--shore-line) bg-white px-2 py-1 text-xs text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
        >
          {PROVIDER_MODELS[providerId].map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {!isDeployed && (
        <ToggleGroup
          label="Env"
          options={[
            { value: "local", label: "Local" },
            { value: "cloud", label: "Cloud" },
          ]}
          value={webMode ? "cloud" : "local"}
          onChange={(v) => onWebModeChange(v === "cloud")}
        />
      )}

      {!webMode && (
        <ToggleGroup
          label="Mode"
          options={[
            { value: "sequential", label: "Sequential" },
            { value: "parallel", label: "Parallel" },
          ]}
          value={mode}
          onChange={(v) => onModeChange(v as "sequential" | "parallel")}
        />
      )}

      {!webMode && mode === "parallel" && (
        <div className="flex items-center gap-2">
          <label htmlFor="concurrency" className="text-xs text-(--sea-ink-soft)">
            Concurrency:
          </label>
          <input
            id="concurrency"
            type="range"
            min={1}
            max={5}
            value={concurrency}
            onChange={(e) => onConcurrencyChange(Number(e.target.value))}
            className="h-1.5 w-20 accent-(--lagoon)"
          />
          <span className="w-4 text-center text-xs font-medium text-(--sea-ink)">
            {concurrency}
          </span>
        </div>
      )}

      {!webMode && mode === "parallel" && activeCardCount !== undefined && activeCardCount > 0 && (
        <span className="text-xs text-(--sea-ink-soft)">
          {activeCardCount} item{activeCardCount !== 1 ? "s" : ""} will each get their own agent
        </span>
      )}
    </div>
  );
}
