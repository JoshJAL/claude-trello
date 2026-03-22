import { createFileRoute, redirect } from "@tanstack/react-router";
import { ConnectTrello } from "#/components/ConnectTrello";
import { ConnectGitHub } from "#/components/ConnectGitHub";
import { ConnectGitLab } from "#/components/ConnectGitLab";
import { ApiKeyForm } from "#/components/ApiKeyForm";
import { PageSkeleton } from "#/components/PageSkeleton";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { getSession } from "#/lib/auth.functions";
import type { AiProviderId } from "#/lib/providers/types";

export const Route = createFileRoute("/settings/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  component: SettingsPage,
  pendingComponent: PageSkeleton,
});

const PROVIDERS: Array<{ id: AiProviderId; label: string }> = [
  { id: "claude", label: "Anthropic (Claude)" },
  { id: "openai", label: "OpenAI (ChatGPT)" },
  { id: "groq", label: "Groq" },
];

function SettingsPage() {
  const { trelloLinked, githubLinked, gitlabLinked, configuredProviders, refetch } =
    useIntegrationStatus();

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold text-[var(--sea-ink)]">
          Settings
        </h1>

        <section className="island-shell mb-6 rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
            Task Sources
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">
                Trello
              </h3>
              <ConnectTrello
                isConnected={trelloLinked}
                onStatusChange={() => refetch()}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">
                GitHub
              </h3>
              <ConnectGitHub
                isConnected={githubLinked}
                onStatusChange={() => refetch()}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">
                GitLab
              </h3>
              <ConnectGitLab
                isConnected={gitlabLinked}
                onStatusChange={() => refetch()}
              />
            </div>
          </div>
        </section>

        <section className="island-shell rounded-2xl p-6">
          <h2 className="mb-2 text-lg font-semibold text-[var(--sea-ink)]">
            AI Providers
          </h2>
          <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
            Configure at least one AI provider to start sessions. You can use
            different providers for different boards.
          </p>
          <div className="space-y-5">
            {PROVIDERS.map((provider) => (
              <div key={provider.id}>
                <h3 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">
                  {provider.label}
                </h3>
                <ApiKeyForm
                  providerId={provider.id}
                  hasKey={configuredProviders.includes(provider.id)}
                  onSaved={() => refetch()}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
