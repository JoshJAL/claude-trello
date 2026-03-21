import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { OnboardingSteps } from "#/components/OnboardingSteps";
import { ConnectTrello } from "#/components/ConnectTrello";
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
  component: OnboardingTrelloPage,
  pendingComponent: PageSkeleton,
});

function OnboardingTrelloPage() {
  const navigate = useNavigate();
  const { trelloLinked } = useIntegrationStatus();

  return (
    <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
      <div className="island-shell w-full max-w-md rounded-2xl p-8">
        <OnboardingSteps currentStep={1} />
        <h2 className="mt-6 mb-2 text-center text-xl font-bold text-[var(--sea-ink)]">
          Connect your Trello account
        </h2>
        <p className="mb-6 text-center text-sm text-[var(--sea-ink-soft)]">
          Link your Trello account so Claude Code can read your boards and
          update checklist items as tasks are completed.
        </p>
        <ConnectTrello
          isConnected={trelloLinked}
          onStatusChange={() => navigate({ to: "/onboarding/api-key" })}
        />
      </div>
    </main>
  );
}
