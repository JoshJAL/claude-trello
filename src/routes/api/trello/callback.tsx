import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/api/trello/callback")({
  component: TrelloCallbackPage,
});

function TrelloCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const token = hash.replace(/^#token=/, "");

    if (!token || token === hash) {
      setError("No token received from Trello");
      return;
    }

    fetch("/api/trello/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to save Trello token");
        // Check where to redirect — settings reconnect vs onboarding
        const statusRes = await fetch("/api/settings/status");
        if (statusRes.ok) {
          const status = await statusRes.json();
          if (status.hasApiKey) {
            navigate({ to: "/settings" });
            return;
          }
        }
        navigate({ to: "/onboarding/api-key" });
      })
      .catch(() => {
        setError("Failed to connect Trello account");
      });
  }, [navigate]);

  if (error) {
    return (
      <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
        <div className="island-shell w-full max-w-md rounded-2xl p-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
      <div className="island-shell w-full max-w-md rounded-2xl p-8 text-center">
        <p className="text-sm text-(--sea-ink-soft)">
          Connecting your Trello account...
        </p>
      </div>
    </main>
  );
}
