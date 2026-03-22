import { createFileRoute } from "@tanstack/react-router";
import { ROADMAP, getRoadmapProgress } from "#/lib/roadmap";
import type { RoadmapStatus } from "#/lib/roadmap";
import { CheckCircle, Clock, Circle } from "lucide-react";

export const Route = createFileRoute("/roadmap")({
  component: RoadmapPage,
  head: () => ({
    meta: [{ title: "Roadmap — TaskPilot" }],
  }),
});

const STATUS_CONFIG: Record<
  RoadmapStatus,
  { icon: typeof CheckCircle; label: string; color: string; bg: string }
> = {
  done: {
    icon: CheckCircle,
    label: "Done",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
  "in-progress": {
    icon: Clock,
    label: "In Progress",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  planned: {
    icon: Circle,
    label: "Planned",
    color: "text-(--shore-line)",
    bg: "bg-(--foam)",
  },
};

function StatusBadge({ status }: { status: RoadmapStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color} ${config.bg}`}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function RoadmapPage() {
  const progress = getRoadmapProgress();

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-(--sea-ink)">Roadmap</h1>
          <p className="mt-1 text-sm text-(--sea-ink-soft)">
            What we've shipped and what's coming next.
          </p>
        </div>

        {/* Progress bar */}
        <div className="island-shell rounded-2xl p-6">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-(--sea-ink)">
              Overall progress
            </span>
            <span className="text-sm text-(--sea-ink-soft)">
              {progress.done}/{progress.total} complete
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-(--foam)">
            <div
              className="h-full rounded-full bg-(--lagoon) transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-3 flex gap-4 text-xs text-(--sea-ink-soft)">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              {progress.done} done
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              {progress.inProgress} in progress
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-(--shore-line)" />
              {progress.planned} planned
            </span>
          </div>
        </div>

        {/* Categories */}
        {ROADMAP.map((category) => (
          <div key={category.name}>
            <h2 className="mb-3 text-lg font-bold text-(--sea-ink)">
              {category.name}
            </h2>
            <div className="space-y-2">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="island-shell flex items-start gap-4 rounded-xl p-4"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-(--sea-ink)">
                        {item.title}
                      </h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-sm text-(--sea-ink-soft)">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="island-shell rounded-2xl p-6 text-center">
          <p className="text-sm text-(--sea-ink-soft)">
            Have a feature request?{" "}
            <a
              href="/feature-request"
              className="font-medium text-(--lagoon) hover:underline"
            >
              Submit one here
            </a>{" "}
            and let us know what you'd like to see.
          </p>
        </div>
      </div>
    </main>
  );
}
