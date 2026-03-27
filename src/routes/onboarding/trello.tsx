import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { OnboardingSteps } from "#/components/OnboardingSteps";
import { ConnectTrello } from "#/components/ConnectTrello";
import { ConnectGitHub } from "#/components/ConnectGitHub";
import { ConnectGitLab } from "#/components/ConnectGitLab";
import { PageSkeleton } from "#/components/PageSkeleton";
import { useIntegrationStatus } from "#/hooks/useIntegrationStatus";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/onboarding/trello")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  component: OnboardingSourcePage,
  pendingComponent: PageSkeleton,
});

function OnboardingSourcePage() {
  const navigate = useNavigate();
  const { trelloLinked, githubLinked, gitlabLinked, hasTaskSource, refetch } =
    useIntegrationStatus();

  return (
    <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
      <div className="island-shell w-full max-w-md rounded-md p-8">
        <OnboardingSteps currentStep={1} />
        <h2 className="mt-6 mb-2 text-center text-xl font-bold text-(--sea-ink)">
          Connect a task source
        </h2>
        <p className="mb-6 text-center text-sm text-(--sea-ink-soft)">
          Connect at least one task source so your AI agents can read tasks and
          update progress as they work.
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
              Trello
            </h3>
            <ConnectTrello
              isConnected={trelloLinked}
              onStatusChange={() => refetch()}
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
              GitHub
            </h3>
            <ConnectGitHub
              isConnected={githubLinked}
              onStatusChange={() => refetch()}
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
              GitLab
            </h3>
            <ConnectGitLab
              isConnected={gitlabLinked}
              onStatusChange={() => refetch()}
            />
          </div>
        </div>

        {hasTaskSource && (
          <button
            onClick={() => navigate({ to: "/onboarding/api-key" })}
            className="mt-6 w-full rounded-md bg-(--lagoon) px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-(--lagoon-deep)"
          >
            Continue
          </button>
        )}
      </div>
    </main>
  );
}
