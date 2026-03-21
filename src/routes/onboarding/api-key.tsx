import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { OnboardingSteps } from "#/components/OnboardingSteps";
import { ApiKeyForm } from "#/components/ApiKeyForm";
import { PageSkeleton } from "#/components/PageSkeleton";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/onboarding/api-key")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  component: OnboardingApiKeyPage,
  pendingComponent: PageSkeleton,
});

function OnboardingApiKeyPage() {
  const navigate = useNavigate();

  return (
    <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
      <div className="island-shell w-full max-w-md rounded-2xl p-8">
        <OnboardingSteps currentStep={2} />
        <h2 className="mt-6 mb-2 text-center text-xl font-bold text-[var(--sea-ink)]">
          Add your Anthropic API key
        </h2>
        <p className="mb-6 text-center text-sm text-[var(--sea-ink-soft)]">
          Claude Code uses your own API key. It is encrypted before storage and
          never displayed.
        </p>
        <ApiKeyForm
          hasKey={false}
          onSaved={() => navigate({ to: "/dashboard" })}
        />
      </div>
    </main>
  );
}
