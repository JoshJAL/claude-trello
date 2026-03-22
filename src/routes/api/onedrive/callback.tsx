import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/api/onedrive/callback")({
  component: OneDriveCallbackPage,
});

function OneDriveCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setError("No authorization code received from Microsoft");
      return;
    }

    fetch("/api/onedrive/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ?? "Failed to connect OneDrive",
          );
        }
        navigate({ to: "/settings" });
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to connect OneDrive",
        );
      });
  }, [navigate]);

  if (error) {
    return (
      <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
        <div className="island-shell w-full max-w-md rounded-2xl p-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
      <div className="island-shell w-full max-w-md rounded-2xl p-8 text-center">
        <p className="text-sm text-(--sea-ink-soft)">
          Connecting your OneDrive...
        </p>
      </div>
    </main>
  );
}
