import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { OnboardingSteps } from "#/components/OnboardingSteps";
import { ApiKeyForm } from "#/components/ApiKeyForm";
import { PageSkeleton } from "#/components/PageSkeleton";
import { getSession } from "#/lib/auth.functions";
import type { AiProviderId } from "#/lib/providers/types";

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

const PROVIDERS: Array<{ id: AiProviderId; label: string }> = [
  { id: "claude", label: "Anthropic (Claude)" },
  { id: "openai", label: "OpenAI (ChatGPT)" },
  { id: "groq", label: "Groq" },
];

function OnboardingApiKeyPage() {
  const navigate = useNavigate();

  return (
    <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
      <div className="island-shell w-full max-w-md rounded-2xl p-8">
        <OnboardingSteps currentStep={2} />
        <h2 className="mt-6 mb-2 text-center text-xl font-bold text-(--sea-ink)">
          Configure an AI Provider
        </h2>
        <p className="mb-6 text-center text-sm text-(--sea-ink-soft)">
          Add at least one API key. Your keys are encrypted before storage and
          never displayed. You can add more providers later in Settings.
        </p>
        <div className="space-y-5">
          {PROVIDERS.map((provider) => (
            <div key={provider.id}>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                {provider.label}
              </h3>
              <ApiKeyForm
                providerId={provider.id}
                hasKey={false}
                onSaved={() => navigate({ to: "/dashboard", search: { q: "" } })}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
