import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: resetError } =
        await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
      if (resetError) {
        setError(resetError.message ?? "Failed to send reset email");
        return;
      }
      setSent(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
      <div className="island-shell w-full max-w-md rounded-2xl p-8">
        <h1 className="mb-2 text-center text-2xl font-bold text-[var(--sea-ink)]">
          Forgot password
        </h1>
        <p className="mb-6 text-center text-sm text-[var(--sea-ink-soft)]">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {sent ? (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
              If an account with that email exists, a reset link has been sent.
              Check your inbox.
            </div>
            <a
              href="/"
              className="text-sm font-medium text-[var(--lagoon)] hover:underline"
            >
              Back to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-[var(--sea-ink)]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-[var(--shore-line)] bg-white/60 px-3 py-2 text-sm text-[var(--sea-ink)] outline-none transition focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[var(--lagoon)]/20 dark:bg-white/5"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-[var(--lagoon)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <p className="text-center text-sm text-[var(--sea-ink-soft)]">
              <a
                href="/"
                className="font-medium text-[var(--lagoon)] hover:underline"
              >
                Back to sign in
              </a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
