import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquarePlus, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/feature-request")({
  component: FeatureRequestPage,
  head: () => ({
    meta: [{ title: "Feature Request — TaskPilot" }],
  }),
});

const CATEGORIES = [
  { value: "feature", label: "New Feature" },
  { value: "improvement", label: "Improvement" },
  { value: "integration", label: "Integration" },
  { value: "other", label: "Other" },
] as const;

function FeatureRequestPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("feature");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const categoryLabel =
      CATEGORIES.find((c) => c.value === category)?.label ?? category;

    let body = `## Description\n\n${description}`;
    body += `\n\n## Category\n\n${categoryLabel}`;
    if (email.trim()) {
      body += `\n\n## Contact\n\n${email.trim()}`;
    }

    const params = new URLSearchParams({
      title,
      body,
      labels: category === "feature" ? "enhancement" : category,
    });

    window.open(
      `https://github.com/JoshJAL/claude-trello/issues/new?${params.toString()}`,
      "_blank",
    );
  }

  const isValid = title.trim().length > 0 && description.trim().length > 0;

  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-(--sea-ink)">
            <MessageSquarePlus size={24} className="text-(--lagoon)" />
            Feature Request
          </h1>
          <p className="mt-1 text-sm text-(--sea-ink-soft)">
            Tell us what you'd like to see in TaskPilot. Your request will be
            submitted as a GitHub issue.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="island-shell space-y-5 rounded-2xl p-6"
        >
          <div>
            <label
              htmlFor="fr-title"
              className="mb-1 block text-sm font-semibold text-(--sea-ink)"
            >
              Title
            </label>
            <input
              id="fr-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. "Add Jira integration"'
              maxLength={200}
              className="w-full rounded-lg border border-(--shore-line) bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 dark:bg-white/5"
            />
          </div>

          <div>
            <label
              htmlFor="fr-category"
              className="mb-1 block text-sm font-semibold text-(--sea-ink)"
            >
              Category
            </label>
            <select
              id="fr-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-(--shore-line) bg-white px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-white text-black dark:bg-[#1e1e1e] dark:text-[#e0e0e0]">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="fr-description"
              className="mb-1 block text-sm font-semibold text-(--sea-ink)"
            >
              Description
            </label>
            <textarea
              id="fr-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you'd like and why it would be useful..."
              rows={6}
              maxLength={2000}
              className="w-full resize-none rounded-lg border border-(--shore-line) bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 dark:bg-white/5"
            />
            <p className="mt-1 text-xs text-(--shore-line)">
              {description.length}/2000
            </p>
          </div>

          <div>
            <label
              htmlFor="fr-email"
              className="mb-1 block text-sm font-semibold text-(--sea-ink)"
            >
              Email{" "}
              <span className="font-normal text-(--shore-line)">(optional)</span>
            </label>
            <input
              id="fr-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="For follow-up questions"
              className="w-full rounded-lg border border-(--shore-line) bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 dark:bg-white/5"
            />
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className="flex items-center gap-2 rounded-lg bg-(--lagoon) px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Submit on GitHub
            <ExternalLink size={14} />
          </button>
        </form>

        <div className="island-shell rounded-2xl p-6 text-center">
          <p className="text-sm text-(--sea-ink-soft)">
            Found a bug instead?{" "}
            <a
              href="https://github.com/JoshJAL/claude-trello/issues/new?labels=bug"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-(--lagoon) hover:underline"
            >
              Report it on GitHub
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
