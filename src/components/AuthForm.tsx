import { useState } from "react";
import { signIn, signUp } from "#/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";

interface AuthFormProps {
  mode: "sign-in" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const { error: signUpError } = await signUp.email({
          name,
          email,
          password,
        });
        if (signUpError) {
          setError(signUpError.message ?? "Registration failed");
          return;
        }
        navigate({ to: "/onboarding/trello" });
      } else {
        const { error: signInError } = await signIn.email({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message ?? "Sign in failed");
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
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
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
            onChange={(e) => setName(e.target.value)}
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
          onChange={(e) => setEmail(e.target.value)}
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
          onChange={(e) => setPassword(e.target.value)}
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
