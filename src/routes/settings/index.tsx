import { createFileRoute, redirect } from "@tanstack/react-router";
import { ConnectTrello } from "#/components/ConnectTrello";
import { ApiKeyForm } from "#/components/ApiKeyForm";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/settings/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { trelloLinked, hasApiKey, refetch } = useIntegrationStatus();

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold text-[var(--sea-ink)]">
          Settings
        </h1>

        <section className="island-shell mb-6 rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
            Trello
          </h2>
          <ConnectTrello
            isConnected={trelloLinked}
            onConnected={() => refetch()}
          />
        </section>

        <section className="island-shell rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
            Anthropic API Key
          </h2>
          <ApiKeyForm hasKey={hasApiKey} onSaved={() => refetch()} />
        </section>
      </div>
    </main>
  );
}
