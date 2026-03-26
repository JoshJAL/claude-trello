import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/other-tools")({
  component: OtherToolsPage,
  head: () => ({
    meta: [{ title: "Other Tools — TaskPilot" }],
  }),
});

const tools = [
  {
    name: "Agent Maker",
    description:
      "Build, customize, and deploy AI agents with a visual editor. Define tools, prompts, and workflows — then publish your agent for others to use.",
    appUrl: "https://agent.task-pilot.dev",
    docsUrl: "https://agent.task-pilot.dev/docs",
  },
];

function OtherToolsPage() {
  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-(--sea-ink)">Other Tools</h1>
          <p className="mt-1 text-sm text-(--sea-ink-soft)">
            Explore other tools in the TaskPilot ecosystem.
          </p>
        </div>

        <div className="space-y-4">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="island-shell rounded-2xl p-6 space-y-3"
            >
              <h2 className="text-lg font-bold text-(--sea-ink)">
                {tool.name}
              </h2>
              <p className="text-sm text-(--sea-ink-soft) leading-relaxed">
                {tool.description}
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href={tool.appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-(--lagoon) px-4 py-2 text-sm font-semibold text-white no-underline hover:opacity-90"
                >
                  Open App
                  <ExternalLink size={14} />
                </a>
                <a
                  href={tool.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-(--shore-line) bg-(--foam) px-4 py-2 text-sm font-semibold text-(--sea-ink) no-underline hover:bg-(--sand)"
                >
                  Documentation
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
