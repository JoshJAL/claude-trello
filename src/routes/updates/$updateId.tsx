import { createFileRoute, Link } from "@tanstack/react-router";
import { getUpdateById } from "#/lib/updates";
import type { UpdateType, UpdateDetailSection } from "#/lib/updates";
import { PageSkeleton } from "#/components/PageSkeleton";
import { ArrowLeft, Sparkles, Wrench, Bug } from "lucide-react";

export const Route = createFileRoute("/updates/$updateId")({
  component: UpdateDetailPage,
  pendingComponent: PageSkeleton,
});

function TypeBadge({ type }: { type: UpdateType }) {
  switch (type) {
    case "feature":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <Sparkles size={14} /> Feature
        </span>
      );
    case "improvement":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <Wrench size={14} /> Improvement
        </span>
      );
    case "fix":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Bug size={14} /> Fix
        </span>
      );
  }
}

function DetailSection({ section }: { section: UpdateDetailSection }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-(--sea-ink)">
        {section.heading}
      </h3>
      <div className="text-sm leading-relaxed text-(--sea-ink-soft)">
        {section.body.split("\n\n").map((paragraph, i) => (
          <p key={i} className={i > 0 ? "mt-3" : ""}>
            {paragraph.split("\n").map((line, j, arr) => (
              <span key={j}>
                {line.startsWith("- ") ? (
                  <span className="ml-2 block">
                    <span className="mr-1.5 text-(--lagoon)">-</span>
                    {line.slice(2)}
                  </span>
                ) : (
                  line
                )}
                {j < arr.length - 1 && !line.startsWith("- ") && <br />}
              </span>
            ))}
          </p>
        ))}
      </div>
      {section.code && (
        <pre className="overflow-x-auto rounded-lg bg-(--foam) p-4 font-mono text-xs leading-relaxed text-(--sea-ink)">
          <code>{section.code}</code>
        </pre>
      )}
    </div>
  );
}

function UpdateDetailPage() {
  const { updateId } = Route.useParams();
  const update = getUpdateById(updateId);

  if (!update) {
    return (
      <main className="page-wrap px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="island-shell rounded-2xl p-8">
            <p className="text-sm text-(--sea-ink-soft)">Update not found.</p>
            <Link to="/updates" className="mt-2 inline-block text-sm text-(--lagoon)">
              Back to Updates
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="island-shell rounded-2xl p-8">
          <div className="mb-4 flex items-center gap-3">
            <Link
              to="/updates"
              className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-(--foam)"
              title="Back to Updates"
            >
              <ArrowLeft size={18} />
            </Link>
            <TypeBadge type={update.type} />
            {update.phase && (
              <span className="text-xs text-(--sea-ink-soft)">
                {update.phase}
              </span>
            )}
            <span className="ml-auto text-xs text-(--sea-ink-soft)">
              {new Date(update.date).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <h1 className="mb-3 text-2xl font-bold text-(--sea-ink)">
            {update.title}
          </h1>
          <p className="text-sm leading-relaxed text-(--sea-ink-soft)">
            {update.description}
          </p>
        </div>

        {/* Detail sections */}
        {update.details && update.details.length > 0 && (
          <div className="island-shell rounded-2xl p-8">
            <div className="space-y-8">
              {update.details.map((section, i) => (
                <DetailSection key={i} section={section} />
              ))}
            </div>
          </div>
        )}

        {/* No details fallback */}
        {(!update.details || update.details.length === 0) && (
          <div className="island-shell rounded-2xl p-8">
            <p className="text-sm text-(--sea-ink-soft)">
              No additional details available for this update.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
