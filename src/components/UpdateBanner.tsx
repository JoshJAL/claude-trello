import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useUpdates, useMarkUpdatesSeen } from "#/hooks/useUpdates";
import { Sparkles, X } from "lucide-react";

/**
 * Dismissible banner shown on dashboard pages when there are unseen updates.
 * Shows the most recent unseen update title with a link to the full Updates page.
 */
export function UpdateBanner() {
  const { updates, unseenCount } = useUpdates();
  const markSeen = useMarkUpdatesSeen();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || unseenCount === 0) return null;

  const latest = updates[0];
  if (!latest) return null;

  const handleDismiss = () => {
    setDismissed(true);
    markSeen.mutate();
  };

  return (
    <div className="mx-auto mb-4 max-w-4xl px-4">
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
        <Sparkles size={18} className="shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-semibold">{latest.title}</span>
            {unseenCount > 1 && (
              <span className="text-blue-600 dark:text-blue-400">
                {" "}and {unseenCount - 1} more update{unseenCount - 1 > 1 ? "s" : ""}
              </span>
            )}
            {" — "}
            <Link
              to="/updates"
              className="font-medium text-blue-700 underline hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
              onClick={() => markSeen.mutate()}
            >
              View all updates
            </Link>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-blue-400 transition hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40 dark:hover:text-blue-300"
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
