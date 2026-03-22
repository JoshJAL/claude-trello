import type { PrResult } from "#/lib/types";

interface PrResultBannerProps {
  prResult: PrResult;
}

export function PrResultBanner({ prResult }: PrResultBannerProps) {
  const statusLabel = prResult.draft ? "draft" : "open";
  const statusColor = prResult.draft
    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5 text-purple-600 dark:text-purple-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
          PR: #{prResult.number}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>
      <a
        href={prResult.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-purple-700 underline hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-100"
      >
        {prResult.title}
      </a>
    </div>
  );
}
