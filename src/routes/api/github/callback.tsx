import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/api/github/callback")({
  component: GitHubCallbackPage,
});

function GitHubCallbackPage() {
  const navigate = useNavigate();

  const connectMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/github/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Failed to connect GitHub",
        );
      }
      const statusRes = await fetch("/api/settings/status");
      if (statusRes.ok) {
        const status = await statusRes.json();
        if (status.hasApiKey) return "settings" as const;
      }
      return "onboarding" as const;
    },
    onSuccess: (redirect) => {
      navigate({ to: redirect === "settings" ? "/settings" : "/onboarding/api-key" });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) return;

    connectMutation.mutate(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (connectMutation.isError) {
    return (
      <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
        <div className="island-shell w-full max-w-md rounded-md p-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            {connectMutation.error.message}
          </p>
          <a
            href="/settings"
            className="mt-4 inline-block text-sm text-(--lagoon) hover:underline"
          >
            Back to settings
          </a>
        </div>
      </main>
    );
  }

  if (!new URLSearchParams(window.location.search).get("code")) {
    return (
      <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
        <div className="island-shell w-full max-w-md rounded-md p-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            No authorization code received from GitHub
          </p>
          <a
            href="/settings"
            className="mt-4 inline-block text-sm text-(--lagoon) hover:underline"
          >
            Back to settings
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
      <div className="island-shell w-full max-w-md rounded-md p-8 text-center">
        <p className="text-sm text-(--sea-ink-soft)">
          Connecting your GitHub account...
        </p>
      </div>
    </main>
  );
}
