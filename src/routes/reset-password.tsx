import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useReducer } from "react";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

interface FormState {
  password: string;
  confirm: string;
  loading: boolean;
  error: string | null;
  success: boolean;
}

type FormAction =
  | { type: "SET_FIELD"; field: "password" | "confirm"; value: string }
  | { type: "SUBMIT" }
  | { type: "ERROR"; message: string }
  | { type: "SUCCESS" }
  | { type: "DONE" };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SUBMIT":
      return { ...state, loading: true, error: null };
    case "ERROR":
      return { ...state, loading: false, error: action.message };
    case "SUCCESS":
      return { ...state, loading: false, success: true };
    case "DONE":
      return { ...state, loading: false };
  }
}

const initialState: FormState = {
  password: "",
  confirm: "",
  loading: false,
  error: null,
  success: false,
};

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(formReducer, initialState);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (state.password !== state.confirm) {
      dispatch({ type: "ERROR", message: "Passwords do not match" });
      return;
    }

    if (state.password.length < 8) {
      dispatch({ type: "ERROR", message: "Password must be at least 8 characters" });
      return;
    }

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      dispatch({ type: "ERROR", message: "Invalid or missing reset token" });
      return;
    }

    dispatch({ type: "SUBMIT" });
    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: state.password,
        token,
      });
      if (resetError) {
        dispatch({ type: "ERROR", message: resetError.message ?? "Failed to reset password" });
        return;
      }
      dispatch({ type: "SUCCESS" });
      setTimeout(() => navigate({ to: "/" }), 2000);
    } catch {
      dispatch({ type: "ERROR", message: "An unexpected error occurred" });
    } finally {
      dispatch({ type: "DONE" });
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

        {state.success ? (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border border-green-300 bg-green-100 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
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
                value={state.password}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "password", value: e.target.value })
                }
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
                value={state.confirm}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "confirm", value: e.target.value })
                }
                className="rounded-lg border border-[var(--shore-line)] bg-white/60 px-3 py-2 text-sm text-[var(--sea-ink)] outline-none transition focus:border-[var(--lagoon)] focus:ring-2 focus:ring-[var(--lagoon)]/20 dark:bg-white/5"
                placeholder="Repeat password"
              />
            </div>

            {state.error && (
              <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={state.loading}
              className="mt-2 rounded-lg bg-[var(--lagoon)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {state.loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
