import { useReducer } from "react";
import { signIn, signUp } from "#/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";

interface AuthFormProps {
  mode: "sign-in" | "register";
}

interface FormState {
  name: string;
  email: string;
  password: string;
  error: string | null;
  loading: boolean;
}

type FormAction =
  | { type: "SET_FIELD"; field: "name" | "email" | "password"; value: string }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_LOADING"; loading: boolean };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
  }
}

const initialState: FormState = {
  name: "",
  email: "",
  password: "",
  error: null,
  loading: false,
};

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(formReducer, initialState);
  const { name, email, password, error, loading } = state;

  const isRegister = mode === "register";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", error: null });
    dispatch({ type: "SET_LOADING", loading: true });

    try {
      if (isRegister) {
        const { error: signUpError } = await signUp.email({
          name,
          email,
          password,
        });
        if (signUpError) {
          dispatch({ type: "SET_ERROR", error: signUpError.message ?? "Registration failed" });
          return;
        }
        navigate({ to: "/onboarding/trello" });
      } else {
        const { error: signInError } = await signIn.email({
          email,
          password,
        });
        if (signInError) {
          dispatch({ type: "SET_ERROR", error: signInError.message ?? "Sign in failed" });
          return;
        }
        // Check integration status to route correctly
        const statusRes = await fetch("/api/settings/status");
        if (statusRes.ok) {
          const status = await statusRes.json();
          if (!status.trelloLinked) {
            navigate({ to: "/onboarding/trello" });
            return;
          }
          if (!status.hasApiKey) {
            navigate({ to: "/onboarding/api-key" });
            return;
          }
        }
        navigate({ to: "/dashboard", search: { q: "" } });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      dispatch({ type: "SET_ERROR", error: message });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isRegister && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-sm font-medium text-(--sea-ink)"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => dispatch({ type: "SET_FIELD", field: "name", value: e.target.value })}
            className="rounded-lg border border-(--shore-line) bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 dark:bg-white/5"
            placeholder="Your name"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-(--sea-ink)"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => dispatch({ type: "SET_FIELD", field: "email", value: e.target.value })}
          className="rounded-lg border border-(--shore-line) bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 dark:bg-white/5"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-(--sea-ink)"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => dispatch({ type: "SET_FIELD", field: "password", value: e.target.value })}
          className="rounded-lg border border-(--shore-line) bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 dark:bg-white/5"
          placeholder="Min. 8 characters"
        />
      </div>

      {!isRegister && (
        <div className="text-right">
          <a
            href="/forgot-password"
            className="text-xs text-(--lagoon) hover:underline"
          >
            Forgot password?
          </a>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-lg bg-(--lagoon) px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading
          ? isRegister
            ? "Creating account..."
            : "Signing in..."
          : isRegister
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="text-center text-sm text-(--sea-ink-soft)">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <a href="/" className="font-medium text-(--lagoon) hover:underline">
              Sign in
            </a>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              className="font-medium text-(--lagoon) hover:underline"
            >
              Register
            </a>
          </>
        )}
      </p>
    </form>
  );
}
