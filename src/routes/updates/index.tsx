import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useUpdates, useMarkUpdatesSeen } from "#/hooks/useUpdates";
import { PageSkeleton } from "#/components/PageSkeleton";
import type { AppUpdate, UpdateType } from "#/lib/updates";
import { Sparkles, Wrench, Bug, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/updates/")({
  component: UpdatesPage,
  pendingComponent: PageSkeleton,
});

function TypeBadge({ type }: { type: UpdateType }) {
  switch (type) {
    case "feature":
      return (
        <span className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <Sparkles size={12} /> Feature
        </span>
      );
    case "improvement":
      return (
        <span className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <Wrench size={12} /> Improvement
        </span>
      );
    case "fix":
      return (
        <span className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Bug size={12} /> Fix
        </span>
      );
  }
}

function UpdateCard({
  update,
  isNew,
}: {
  update: AppUpdate;
  isNew: boolean;
}) {
  return (
    <Link
      to="/updates/$updateId"
      params={{ updateId: update.id }}
      className={`group block rounded-md border p-4 no-underline transition hover:-translate-y-0.5 hover:shadow-md ${
        isNew
          ? "border-blue-200 bg-blue-50/50 hover:border-blue-300 dark:border-blue-800 dark:bg-blue-950/20 dark:hover:border-blue-700"
          : "border-(--shore-line) bg-white/60 hover:border-(--lagoon) dark:bg-white/5"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <TypeBadge type={update.type} />
        {isNew && (
          <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            New
          </span>
        )}
        {update.phase && (
          <span className="text-xs text-(--sea-ink-soft)">
            {update.phase}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs text-(--sea-ink-soft)">
          {new Date(update.date).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          <ChevronRight size={14} className="opacity-0 transition group-hover:opacity-100" />
        </span>
      </div>
      <h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
        {update.title}
      </h3>
      <p className="text-sm leading-relaxed text-(--sea-ink-soft)">
        {update.description}
      </p>
    </Link>
  );
}

function UpdatesPage() {
  const { updates, lastSeenAt, isLoading } = useUpdates();
  const markSeen = useMarkUpdatesSeen();

  // Mark as seen when the user visits this page
  useEffect(() => {
    markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastSeenDate = lastSeenAt ? new Date(lastSeenAt) : null;

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="island-shell rounded-md p-8">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles size={20} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-(--sea-ink)">
              What's New
            </h1>
          </div>
          <p className="mb-6 text-sm text-(--sea-ink-soft)">
            Latest features, improvements, and fixes in TaskPilot.
          </p>

          {updates.length === 0 ? (
            <p className="text-sm text-(--sea-ink-soft)">
              No updates yet. Check back soon!
            </p>
          ) : (
            <div className="space-y-3">
              {updates.map((update) => {
                const isNew = lastSeenDate
                  ? new Date(update.date) > lastSeenDate
                  : true;
                return (
                  <UpdateCard
                    key={update.id}
                    update={update}
                    isNew={isNew}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
