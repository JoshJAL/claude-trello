import { useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";

export function ErrorFallback({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <main className="page-wrap flex min-h-[60vh] items-center justify-center px-4">
      <div className="island-shell w-full max-w-md rounded-2xl p-8 text-center">
        <div className="mb-4 text-4xl">!</div>
        <h1 className="mb-2 text-xl font-bold text-[var(--sea-ink)]">
          Something went wrong
        </h1>
        <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => {
              reset();
              router.invalidate();
            }}
            className="rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-lg border border-[var(--shore-line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--foam)]"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
