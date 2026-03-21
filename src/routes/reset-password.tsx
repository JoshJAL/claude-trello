import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (resetError) {
        setError(resetError.message ?? "Failed to reset password");
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate({ to: "/" }), 2000);
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
          Reset password
        </h1>
        <p className="mb-6 text-center text-sm text-[var(--sea-ink-soft)]">
          Enter your new password below.
        </p>

        {success ? (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
              Password reset successfully. Redirecting to sign in...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-[var(--sea-ink)]"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-[var(--shore-line)] bg-white/60 px-3 py-2 text-sm text-[var(--sea-ink)] outline-none transition focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[var(--lagoon)]/20 dark:bg-white/5"
                placeholder="Min. 8 characters"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirm"
                className="text-sm font-medium text-[var(--sea-ink)]"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-lg border border-[var(--shore-line)] bg-white/60 px-3 py-2 text-sm text-[var(--sea-ink)] outline-none transition focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[var(--lagoon)]/20 dark:bg-white/5"
                placeholder="Repeat password"
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
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
