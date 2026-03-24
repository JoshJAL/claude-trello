import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ai-models")({
  component: AiModelsPage,
  head: () => ({
    meta: [{ title: "AI Models — TaskPilot" }],
  }),
});

function AiModelsPage() {
  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-(--sea-ink)">AI Models</h1>
          <p className="mt-1 text-sm text-(--sea-ink-soft)">
            TaskPilot supports three AI providers. Select a provider and model from the session toolbar before starting a session.
          </p>
        </div>

        {/* Claude */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-(--sea-ink)">Claude (Anthropic) — Default Provider</h2>
          <p className="text-sm text-(--sea-ink-soft)">
            Claude models excel at coding, analysis, and following complex instructions.
            Default to Sonnet 4.6 for 80%+ of tasks — it offers the best quality-to-cost ratio.
          </p>
          <div className="island-shell overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-(--shore-line) text-xs font-semibold text-(--sea-ink-soft)">
                  <th className="px-4 py-2">Model</th>
                  <th className="px-4 py-2">Context</th>
                  <th className="px-4 py-2">Input / Output</th>
                  <th className="px-4 py-2">Best For</th>
                </tr>
              </thead>
              <tbody className="text-(--sea-ink)">
                <tr className="border-b border-(--shore-line)/50">
                  <td className="px-4 py-2 font-medium">Haiku 4.5</td>
                  <td className="px-4 py-2">200K</td>
                  <td className="px-4 py-2 text-xs">$1 / $5</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">High-volume simple tasks — classification, extraction, formatting. 12x cheaper than Sonnet.</td>
                </tr>
                <tr className="border-b border-(--shore-line)/50">
                  <td className="px-4 py-2 font-medium">Opus 4.6</td>
                  <td className="px-4 py-2">1M</td>
                  <td className="px-4 py-2 text-xs">$15 / $75</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">Deep scientific reasoning, complex multi-file refactors, agent teams. 91.3% GPQA Diamond.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">
                    Sonnet 4.6 <span className="ml-1 rounded bg-(--lagoon)/10 px-1.5 py-0.5 text-[10px] font-semibold text-(--lagoon)">default</span>
                  </td>
                  <td className="px-4 py-2">200K</td>
                  <td className="px-4 py-2 text-xs">$3 / $15</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">General coding, most tasks — best balance of quality and cost. 79.6% SWE-bench.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* OpenAI */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-(--sea-ink)">OpenAI</h2>
          <p className="text-sm text-(--sea-ink-soft)">
            OpenAI&apos;s GPT-5.4 family delivers strong reasoning and coding performance.
            GPT-5.4 Mini is the recommended default — it approaches full GPT-5.4 quality at a fraction of the cost.
          </p>
          <div className="island-shell overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-(--shore-line) text-xs font-semibold text-(--sea-ink-soft)">
                  <th className="px-4 py-2">Model</th>
                  <th className="px-4 py-2">Context</th>
                  <th className="px-4 py-2">Input / Output</th>
                  <th className="px-4 py-2">Best For</th>
                </tr>
              </thead>
              <tbody className="text-(--sea-ink)">
                <tr className="border-b border-(--shore-line)/50">
                  <td className="px-4 py-2 font-medium">
                    GPT-5.4 <span className="ml-1 rounded bg-(--lagoon)/10 px-1.5 py-0.5 text-[10px] font-semibold text-(--lagoon)">default</span>
                  </td>
                  <td className="px-4 py-2">1M</td>
                  <td className="px-4 py-2 text-xs">$2.50 / $15</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">Most demanding reasoning and professional tasks.</td>
                </tr>
                <tr className="border-b border-(--shore-line)/50">
                  <td className="px-4 py-2 font-medium">GPT-5.4 Mini</td>
                  <td className="px-4 py-2">400K</td>
                  <td className="px-4 py-2 text-xs">$0.75 / $4.50</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">General coding, high-volume workloads — 2x faster than full GPT-5.4, approaches its performance.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">GPT-5.4 Nano</td>
                  <td className="px-4 py-2">400K</td>
                  <td className="px-4 py-2 text-xs">$0.20 / $1.25</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">Classification, data extraction, ranking, lightweight sub-agents. Cheapest OpenAI option.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Groq */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-(--sea-ink)">Groq (Ultra-Fast Inference)</h2>
          <p className="text-sm text-(--sea-ink-soft)">
            All Groq models run on Groq&apos;s custom LPU hardware for extremely fast inference.
            Choose Groq when speed matters more than frontier intelligence.
          </p>
          <div className="island-shell overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-(--shore-line) text-xs font-semibold text-(--sea-ink-soft)">
                  <th className="px-4 py-2">Model</th>
                  <th className="px-4 py-2">Context</th>
                  <th className="px-4 py-2">Cost (per 1M)</th>
                  <th className="px-4 py-2">Best For</th>
                </tr>
              </thead>
              <tbody className="text-(--sea-ink)">
                <tr className="border-b border-(--shore-line)/50">
                  <td className="px-4 py-2 font-medium">GPT-OSS 120B</td>
                  <td className="px-4 py-2">131K</td>
                  <td className="px-4 py-2 text-xs">~$1.20</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">Highest quality on Groq — OpenAI&apos;s open-weight model with built-in search and code execution.</td>
                </tr>
                <tr className="border-b border-(--shore-line)/50">
                  <td className="px-4 py-2 font-medium">Kimi K2</td>
                  <td className="px-4 py-2">262K</td>
                  <td className="px-4 py-2 text-xs">~$1.50</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">Agentic tasks, tool use, coding benchmarks. Largest context on Groq.</td>
                </tr>
                <tr className="border-b border-(--shore-line)/50">
                  <td className="px-4 py-2 font-medium">Llama 3.1 8B</td>
                  <td className="px-4 py-2">128K</td>
                  <td className="px-4 py-2 text-xs">~$0.06</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">Ultra-cheap simple tasks. Fastest and cheapest option.</td>
                </tr>
                <tr className="border-b border-(--shore-line)/50">
                  <td className="px-4 py-2 font-medium">
                    Llama 3.3 70B <span className="ml-1 rounded bg-(--lagoon)/10 px-1.5 py-0.5 text-[10px] font-semibold text-(--lagoon)">default</span>
                  </td>
                  <td className="px-4 py-2">128K</td>
                  <td className="px-4 py-2 text-xs">~$0.60</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">General-purpose, proven reliability. Best default for Groq.</td>
                </tr>
                <tr className="border-b border-(--shore-line)/50">
                  <td className="px-4 py-2 font-medium">Llama 4 Scout</td>
                  <td className="px-4 py-2">10M</td>
                  <td className="px-4 py-2 text-xs">Low</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">Massive context window (10M tokens), blazing-fast speed (2600 tok/s).</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Qwen 3 32B</td>
                  <td className="px-4 py-2">128K</td>
                  <td className="px-4 py-2 text-xs">~$0.30</td>
                  <td className="px-4 py-2 text-xs text-(--sea-ink-soft)">Reasoning and dialogue with thinking/non-thinking modes.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Choosing a Model */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-(--sea-ink)">Choosing a Model</h2>
          <div className="island-shell space-y-2 rounded-2xl p-5">
            <Tip label="Most tasks">Use <strong>Claude Sonnet 4.6</strong> — best quality-to-cost ratio for coding.</Tip>
            <Tip label="Deep reasoning">Use <strong>Opus 4.6</strong> for multi-file refactors, scientific analysis, or 1M context.</Tip>
            <Tip label="Budget-conscious">Use <strong>Haiku 4.5</strong> or <strong>GPT-5.4 Nano</strong> for high-volume simple work.</Tip>
            <Tip label="OpenAI default">Use <strong>GPT-5.4</strong> for demanding tasks or <strong>GPT-5.4 Mini</strong> for faster, cheaper general work.</Tip>
            <Tip label="Speed-critical">Use <strong>Groq</strong> — all models benefit from LPU hardware acceleration.</Tip>
            <Tip label="Massive context">Use <strong>Llama 4 Scout</strong> on Groq (10M tokens) or <strong>Opus 4.6</strong> (1M tokens).</Tip>
          </div>
        </section>

        <p className="text-xs text-(--sea-ink-soft)">
          Prices shown are per 1 million tokens. Actual costs depend on task complexity and token usage.
          Model selection is available in the session toolbar dropdown. Switching providers resets to that provider&apos;s default model.
        </p>
      </div>
    </main>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-sm text-(--sea-ink-soft)">
      <span className="font-semibold text-(--sea-ink)">{label}:</span>{" "}
      {children}
    </p>
  );
}
