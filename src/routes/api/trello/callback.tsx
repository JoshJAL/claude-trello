import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/api/trello/callback")({
  component: TrelloCallbackPage,
});

function TrelloCallbackPage() {
  const navigate = useNavigate();

  const connectMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch("/api/trello/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("Failed to save Trello token");
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
    const hash = window.location.hash;
    const token = hash.replace(/^#token=/, "");

    if (!token || token === hash) return;

    connectMutation.mutate(token);
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
            href="/onboarding/trello"
            className="mt-4 inline-block text-sm text-(--lagoon) hover:underline"
          >
            Try again
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
      <div className="island-shell w-full max-w-md rounded-md p-8 text-center">
        <p className="text-sm text-(--sea-ink-soft)">
          Connecting your Trello account...
        </p>
      </div>
    </main>
  );
}
