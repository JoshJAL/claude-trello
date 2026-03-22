interface OnboardingStepsProps {
  currentStep: 1 | 2;
}

const steps = [
  { number: 1, label: "Task Source" },
  { number: 2, label: "API Key" },
] as const;

export function OnboardingSteps({ currentStep }: OnboardingStepsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {steps.map((step, i) => (
        <div key={step.number} className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                step.number < currentStep
                  ? "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-300"
                  : step.number === currentStep
                    ? "bg-[var(--lagoon)] text-white"
                    : "bg-[var(--foam)] text-[var(--sea-ink-soft)]"
              }`}
            >
              {step.number < currentStep ? "\u2713" : step.number}
            </div>
            <span
              className={`text-sm font-medium ${
                step.number === currentStep
                  ? "text-[var(--sea-ink)]"
                  : "text-[var(--sea-ink-soft)]"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="h-px w-12 bg-[var(--shore-line)]" />
          )}
        </div>
      ))}
    </div>
  );
}
