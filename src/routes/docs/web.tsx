import { createFileRoute } from "@tanstack/react-router";
import {
  Globe,
  LogIn,
  Link2,
  Key,
  LayoutDashboard,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  Trello,
  Github,
  Gitlab,
  Cpu,
  GitBranch,
} from "lucide-react";
import { useState, useCallback } from "react";

export const Route = createFileRoute("/docs/web")({
  component: WebDocsPage,
  head: () => ({
    meta: [{ title: "Web App Documentation — TaskPilot" }],
  }),
});

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute right-3 top-3 rounded-md border border-white/10 bg-white/5 p-1.5 text-white/40 opacity-0 transition group-hover:opacity-100 hover:text-white/80"
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function CodeBlock({
  children,
  copyText,
}: {
  children: React.ReactNode;
  copyText?: string;
}) {
  const text =
    copyText ??
    (typeof children === "string" ? children : "");

  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-xl border border-(--line) bg-(--code-bg) p-5 text-sm leading-relaxed text-(--code-text)">
        <code>{children}</code>
      </pre>
      {text && <CopyButton text={text} />}
    </div>
  );
}

function StepCard({
  number,
  icon: Icon,
  title,
  children,
}: {
  number: number;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="island-shell rounded-2xl p-6">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--lagoon) text-sm font-bold text-white">
          {number}
        </span>
        <Icon size={20} className="text-(--lagoon)" />
        <h3 className="text-base font-semibold text-(--sea-ink)">
          {title}
        </h3>
      </div>
      <div className="ml-11 space-y-3 text-sm text-(--sea-ink-soft)">
        {children}
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="island-shell rounded-xl p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={18} className="text-(--lagoon)" />
        <h3 className="text-sm font-semibold text-(--sea-ink)">
          {title}
        </h3>
      </div>
      <div className="text-sm text-(--sea-ink-soft)">{children}</div>
    </div>
  );
}

function WebDocsPage() {
  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--lagoon) text-white">
              <Globe size={22} />
            </div>
            <div>
              <span className="island-kicker">Documentation</span>
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-(--sea-ink)">
            Web App
          </h1>
          <p className="text-base text-(--sea-ink-soft)">
            The TaskPilot web app is your control center. Connect task sources,
            configure AI providers, and launch coding sessions — all from
            your browser.
          </p>
        </div>

        {/* ── Overview ────────────────────────────────────────────── */}
        <section className="island-shell mb-6 rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-(--sea-ink)">
            What You Can Do
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureCard icon={Link2} title="Connect Task Sources">
              <p>
                Link your Trello, GitHub, or GitLab accounts to pull in boards,
                repos, and issues as tasks for the AI to work through.
              </p>
            </FeatureCard>
            <FeatureCard icon={Cpu} title="Choose AI Providers">
              <p>
                Configure API keys for Claude, OpenAI, or Groq. Switch between
                providers per session depending on your needs.
              </p>
            </FeatureCard>
            <FeatureCard icon={LayoutDashboard} title="Run Sessions">
              <p>
                Select a board or repo, review the tasks, and launch an AI
                coding session. Watch progress in real time as items get checked
                off.
              </p>
            </FeatureCard>
            <FeatureCard icon={GitBranch} title="Parallel Agents">
              <p>
                Run multiple agents simultaneously — one per card or issue — in
                isolated git worktrees. Changes merge back automatically.
              </p>
            </FeatureCard>
          </div>
        </section>

        {/* ── Getting Started ─────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Getting Started
          </h2>
          <div className="space-y-4">
            <StepCard number={1} icon={LogIn} title="Create an account">
              <p>
                Register with your email and password on the sign-in page. If
                you already have an account, just sign in.
              </p>
            </StepCard>

            <StepCard number={2} icon={Link2} title="Connect a task source">
              <p>
                After signing in you'll land on the onboarding page. Connect at
                least one task source:
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  <strong className="text-(--sea-ink)">Trello</strong> —
                  click "Connect Trello" to authorize via OAuth
                </li>
                <li>
                  <strong className="text-(--sea-ink)">GitHub</strong> —
                  click "Connect GitHub" to authorize via OAuth
                </li>
                <li>
                  <strong className="text-(--sea-ink)">GitLab</strong> —
                  click "Connect GitLab" to authorize via OAuth
                </li>
              </ul>
              <p>
                You can connect multiple sources and switch between them from the
                sidebar.
              </p>
            </StepCard>

            <StepCard number={3} icon={Key} title="Add an AI provider API key">
              <p>
                Paste your API key for at least one AI provider. Keys are
                encrypted (AES-256-GCM) before being stored — they're never
                visible after saving.
              </p>
              <div className="rounded-lg border border-(--line) p-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-(--line)">
                      <th className="pb-2 text-left font-semibold text-(--sea-ink)">
                        Provider
                      </th>
                      <th className="pb-2 text-left font-semibold text-(--sea-ink)">
                        Key prefix
                      </th>
                      <th className="pb-2 text-left font-semibold text-(--sea-ink)">
                        Where to get it
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-(--sea-ink-soft)">
                    <tr className="border-b border-(--line)">
                      <td className="py-1.5">Claude</td>
                      <td>
                        <code className="text-xs">sk-ant-api03-</code>
                      </td>
                      <td>
                        <a
                          href="https://console.anthropic.com/settings/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-(--lagoon) hover:underline"
                        >
                          console.anthropic.com
                        </a>
                      </td>
                    </tr>
                    <tr className="border-b border-(--line)">
                      <td className="py-1.5">OpenAI</td>
                      <td>
                        <code className="text-xs">sk-</code>
                      </td>
                      <td>
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-(--lagoon) hover:underline"
                        >
                          platform.openai.com
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5">Groq</td>
                      <td>
                        <code className="text-xs">gsk_</code>
                      </td>
                      <td>
                        <a
                          href="https://console.groq.com/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-(--lagoon) hover:underline"
                        >
                          console.groq.com
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </StepCard>

            <StepCard
              number={4}
              icon={LayoutDashboard}
              title="Launch a session"
            >
              <p>
                Once onboarding is complete you'll land on the dashboard. Select
                a board or repo, review the cards/issues, and hit{" "}
                <strong className="text-(--sea-ink)">Start Session</strong>{" "}
                to begin.
              </p>
            </StepCard>
          </div>
        </section>

        {/* ── Dashboard ──────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Dashboard
          </h2>
          <div className="space-y-4">
            <div className="island-shell rounded-2xl p-6">
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-(--sea-ink)">
                <Trello size={18} className="text-(--lagoon)" />
                Trello
              </h3>
              <div className="space-y-2 text-sm text-(--sea-ink-soft)">
                <p>
                  Navigate to{" "}
                  <strong className="text-(--sea-ink)">Trello</strong> in
                  the sidebar to see your connected boards. Select a board to
                  view its lists and cards.
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Cards are grouped by list (To Do, In Progress, etc.)
                  </li>
                  <li>
                    Each card shows its checklist items and completion progress
                  </li>
                  <li>Done cards are greyed out and excluded from sessions</li>
                  <li>
                    When the agent completes all checklist items on a card, it
                    automatically moves to your Done list
                  </li>
                </ul>
              </div>
            </div>

            <div className="island-shell rounded-2xl p-6">
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-(--sea-ink)">
                <Github size={18} className="text-(--lagoon)" />
                GitHub
              </h3>
              <div className="space-y-2 text-sm text-(--sea-ink-soft)">
                <p>
                  Navigate to{" "}
                  <strong className="text-(--sea-ink)">GitHub</strong> in
                  the sidebar to browse your repositories. Select a repo to view
                  its open issues.
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Issues with markdown task lists (
                    <code className="rounded border border-(--line) bg-(--surface) px-1 text-xs">
                      - [ ] item
                    </code>
                    ) are parsed into checkable items
                  </li>
                  <li>
                    The agent checks off task list items in the issue body as it
                    works
                  </li>
                  <li>
                    The agent can close issues, leave comments, and create pull
                    requests
                  </li>
                </ul>
              </div>
            </div>

            <div className="island-shell rounded-2xl p-6">
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-(--sea-ink)">
                <Gitlab size={18} className="text-(--lagoon)" />
                GitLab
              </h3>
              <div className="space-y-2 text-sm text-(--sea-ink-soft)">
                <p>
                  Navigate to{" "}
                  <strong className="text-(--sea-ink)">GitLab</strong> in
                  the sidebar to see your projects. Select a project to view its
                  open issues.
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Works the same as GitHub — task lists in issue descriptions
                    become checkable items
                  </li>
                  <li>
                    The agent can close issues, add notes, and create merge
                    requests
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Running a Session ───────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Running a Session
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-(--sea-ink-soft)">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--foam) text-xs font-bold text-(--lagoon)">
                  1
                </div>
                <p>
                  <strong className="text-(--sea-ink)">
                    Select your tasks
                  </strong>{" "}
                  — Pick a Trello board, GitHub repo, or GitLab project from the
                  dashboard. Review the active cards or issues that the agent
                  will work through.
                </p>
              </div>
              <div className="flex justify-center">
                <ArrowRight
                  size={16}
                  className="text-(--shore-line)"
                />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--foam) text-xs font-bold text-(--lagoon)">
                  2
                </div>
                <p>
                  <strong className="text-(--sea-ink)">
                    Choose a mode
                  </strong>{" "}
                  — Select{" "}
                  <strong className="text-(--sea-ink)">Sequential</strong>{" "}
                  (one card at a time) or{" "}
                  <strong className="text-(--sea-ink)">Parallel</strong>{" "}
                  (one agent per card, running concurrently in isolated git
                  worktrees). Adjust the concurrency slider if using parallel
                  mode.
                </p>
              </div>
              <div className="flex justify-center">
                <ArrowRight
                  size={16}
                  className="text-(--shore-line)"
                />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--foam) text-xs font-bold text-(--lagoon)">
                  3
                </div>
                <p>
                  <strong className="text-(--sea-ink)">
                    Pick your AI provider
                  </strong>{" "}
                  — If you have multiple provider keys configured, a dropdown
                  lets you choose which model to use. Defaults to Claude.
                </p>
              </div>
              <div className="flex justify-center">
                <ArrowRight
                  size={16}
                  className="text-(--shore-line)"
                />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--foam) text-xs font-bold text-(--lagoon)">
                  4
                </div>
                <p>
                  <strong className="text-(--sea-ink)">
                    Start the session
                  </strong>{" "}
                  — Click{" "}
                  <strong className="text-(--sea-ink)">
                    Start Session
                  </strong>
                  . The session log streams AI output in real time. In
                  sequential mode you see a single log. In parallel mode each
                  agent gets its own tab with a status grid showing progress.
                </p>
              </div>
              <div className="flex justify-center">
                <ArrowRight
                  size={16}
                  className="text-(--shore-line)"
                />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--foam) text-xs font-bold text-(--lagoon)">
                  5
                </div>
                <p>
                  <strong className="text-(--sea-ink)">
                    Tasks update automatically
                  </strong>{" "}
                  — As the agent finishes items, your task source updates in real
                  time. Trello cards move to Done. GitHub/GitLab task list items
                  get checked off. The board panel refreshes automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Parallel Mode ──────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Parallel Mode
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-3 text-sm text-(--sea-ink-soft)">
              <p>
                Parallel mode launches{" "}
                <strong className="text-(--sea-ink)">
                  one agent per card or issue
                </strong>
                , each in an isolated git worktree. This lets multiple tasks be
                worked on simultaneously without conflicts.
              </p>
              <div className="rounded-lg border border-(--line) p-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-(--line)">
                      <th className="pb-2 text-left font-semibold text-(--sea-ink)">
                        Setting
                      </th>
                      <th className="pb-2 text-left font-semibold text-(--sea-ink)">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-(--sea-ink-soft)">
                    <tr className="border-b border-(--line)">
                      <td className="py-1.5">Max concurrency</td>
                      <td>1 to 5 agents (default: 3)</td>
                    </tr>
                    <tr className="border-b border-(--line)">
                      <td className="py-1.5">Per-agent cost budget</td>
                      <td>$2 (default across all providers)</td>
                    </tr>
                    <tr className="border-b border-(--line)">
                      <td className="py-1.5">Isolation</td>
                      <td>Each agent runs in its own git worktree</td>
                    </tr>
                    <tr>
                      <td className="py-1.5">Merge strategy</td>
                      <td>Sequential merge after agents complete</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                After all agents finish, changes are merged back one at a time.
                If two agents modify the same files, a merge conflict may occur.
                The summary panel reports any conflicts so you can resolve them
                manually.
              </p>
            </div>
          </div>
        </section>

        {/* ── Settings ───────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Settings
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-(--sea-ink-soft)">
              <p>
                The{" "}
                <strong className="text-(--sea-ink)">Settings</strong> page
                (accessible from the sidebar) lets you manage all your
                connections and API keys at any time.
              </p>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Task Sources
                </h3>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Connect or disconnect Trello, GitHub, and GitLab
                  </li>
                  <li>
                    Each source uses OAuth — click to connect and authorize in
                    your browser
                  </li>
                  <li>
                    Tokens are stored securely on the server and never exposed to
                    the client
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  AI Provider Keys
                </h3>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Add or remove API keys for Claude, OpenAI, and Groq
                  </li>
                  <li>
                    Keys are validated by prefix before saving (e.g.{" "}
                    <code className="rounded border border-(--line) bg-(--surface) px-1 text-xs">
                      sk-ant-api03-
                    </code>{" "}
                    for Claude)
                  </li>
                  <li>
                    All keys are encrypted with AES-256-GCM — the stored key is
                    never displayed, even partially
                  </li>
                  <li>
                    The provider dropdown on the dashboard only shows providers
                    you have keys for
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ───────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            How It Works
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <CodeBlock>{`Browser                         Server                      Task Source API
  │                                │                              │
  │  1. Sign in (email/password)   │                              │
  │───────────────────────────────>│                              │
  │        session cookie          │                              │
  │<───────────────────────────────│                              │
  │                                │                              │
  │  2. Connect source (OAuth)     │                              │
  │───────────────────────────────>│──── OAuth flow ─────────────>│
  │        token stored            │        token                 │
  │<───────────────────────────────│<─────────────────────────────│
  │                                │                              │
  │  3. Save API key               │                              │
  │───────────────────────────────>│                              │
  │        encrypt + store         │                              │
  │<───────────────────────────────│                              │
  │                                │                              │
  │  4. Select board + start       │   GET boards/repos/issues    │
  │───────────────────────────────>│─────────────────────────────>│
  │        task data               │         tasks                │
  │<───────────────────────────────│<─────────────────────────────│
  │                                │                              │
  │  5. Session streams via SSE    │                              │
  │<═══════════════════════════════│  AI agent processes tasks    │
  │        real-time output        │         │                    │
  │                                │         │  check/close task  │
  │                                │         │───────────────────>│
  │  6. Board panel refreshes      │                              │
  │<═══════════════════════════════│                              │`}</CodeBlock>
          </div>
        </section>

        {/* ── Task Format ────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Task Format by Source
          </h2>
          <div className="space-y-4">
            <div className="island-shell rounded-xl p-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-(--sea-ink)">
                <Trello size={16} className="text-(--lagoon)" />
                Trello
              </h3>
              <p className="mb-3 text-sm text-(--sea-ink-soft)">
                Cards with checklists. Each checklist item becomes a task for the
                agent. Structure your board with lists like "To Do", "In
                Progress", and "Done".
              </p>
              <CodeBlock>{`Board: My Project
├── To Do
│   ├── Card: Fix auth bug
│   │   └── Checklist:
│   │       ├── [ ] Fix token refresh logic
│   │       ├── [ ] Add error handling
│   │       └── [ ] Write tests
│   └── Card: Add dark mode
│       └── Checklist:
│           ├── [ ] Add theme toggle
│           └── [ ] Update color variables
└── Done
    └── (completed cards moved here)`}</CodeBlock>
            </div>

            <div className="island-shell rounded-xl p-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-(--sea-ink)">
                <Github size={16} className="text-(--lagoon)" />
                GitHub / <Gitlab size={16} className="text-(--lagoon)" />{" "}
                GitLab
              </h3>
              <p className="mb-3 text-sm text-(--sea-ink-soft)">
                Issues with markdown task lists. Write task lists in the issue
                body and the agent will check them off as it works.
              </p>
              <CodeBlock>{`Issue #42: Fix authentication bug

Description:
The token refresh flow is broken. Fix the following:

- [ ] Fix token refresh logic in auth.ts
- [ ] Add error handling for expired tokens
- [ ] Write unit tests for the refresh flow
- [ ] Update API docs with new error codes`}</CodeBlock>
            </div>
          </div>
        </section>

        {/* ── FAQ / Troubleshooting ──────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Troubleshooting
          </h2>
          <div className="space-y-3">
            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-(--sea-ink)">
                I connected Trello/GitHub/GitLab but no boards or repos appear
              </summary>
              <div className="border-t border-(--line) px-5 py-4 text-sm text-(--sea-ink-soft)">
                Make sure your OAuth token hasn't expired. Go to{" "}
                <strong className="text-(--sea-ink)">Settings</strong>,
                disconnect the source, and reconnect it. For GitHub, ensure the
                OAuth app has access to the repos you expect (check your GitHub
                OAuth app permissions).
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-(--sea-ink)">
                The session started but nothing is happening
              </summary>
              <div className="border-t border-(--line) px-5 py-4 text-sm text-(--sea-ink-soft)">
                Check that your AI provider API key is valid and has sufficient
                credits. Go to{" "}
                <strong className="text-(--sea-ink)">Settings</strong> to
                verify your key is configured. If using Claude, make sure you
                have{" "}
                <code className="rounded border border-(--line) bg-(--surface) px-1 text-xs">
                  @anthropic-ai/claude-code
                </code>{" "}
                installed globally on the server.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-(--sea-ink)">
                Can I run multiple sessions at the same time?
              </summary>
              <div className="border-t border-(--line) px-5 py-4 text-sm text-(--sea-ink-soft)">
                Each user is limited to one active session at a time. Wait for
                the current session to finish, or stop it before starting
                another. In parallel mode, the concurrency limit controls how
                many agents run simultaneously within a single session.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-(--sea-ink)">
                Parallel mode has merge conflicts
              </summary>
              <div className="border-t border-(--line) px-5 py-4 text-sm text-(--sea-ink-soft)">
                When multiple agents edit the same files, merge conflicts can
                occur during the sequential merge phase. The summary panel will
                flag these. Resolve them manually in your working directory after
                the session finishes.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-(--sea-ink)">
                The provider dropdown only shows Claude
              </summary>
              <div className="border-t border-(--line) px-5 py-4 text-sm text-(--sea-ink-soft)">
                The dropdown only appears when you have two or more provider keys
                configured. Go to{" "}
                <strong className="text-(--sea-ink)">Settings</strong> and
                add API keys for OpenAI or Groq to see additional options.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-(--sea-ink)">
                Where is my data stored?
              </summary>
              <div className="border-t border-(--line) px-5 py-4 text-sm text-(--sea-ink-soft)">
                TaskPilot uses Turso (cloud SQLite) for all persistent data.
                Passwords are hashed with bcrypt. API keys are encrypted with
                AES-256-GCM. OAuth tokens are stored server-side and never sent
                to the client. Session cookies are HTTP-only and signed.
              </div>
            </details>
          </div>
        </section>

        {/* ── Security ───────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Security
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <ul className="space-y-3 text-sm text-(--sea-ink-soft)">
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                />
                <span>
                  <strong className="text-(--sea-ink)">
                    Passwords hashed with bcrypt
                  </strong>{" "}
                  — managed by Better Auth, never stored or logged in plaintext
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                />
                <span>
                  <strong className="text-(--sea-ink)">
                    API keys encrypted at rest
                  </strong>{" "}
                  (AES-256-GCM) — decrypted only at the moment a session is
                  launched, never returned to the browser
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                />
                <span>
                  <strong className="text-(--sea-ink)">
                    OAuth tokens stored server-side only
                  </strong>{" "}
                  — Trello, GitHub, and GitLab tokens are never sent to the
                  client
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                />
                <span>
                  <strong className="text-(--sea-ink)">
                    HTTP-only session cookies
                  </strong>{" "}
                  — signed with BETTER_AUTH_SECRET, inaccessible to JavaScript
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                />
                <span>
                  <strong className="text-(--sea-ink)">
                    All server functions authenticated
                  </strong>{" "}
                  — every API route checks the session before accessing
                  user-specific data
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ── Session History ──────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Session History
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-(--sea-ink-soft)">
              <p>
                The{" "}
                <strong className="text-(--sea-ink)">/history</strong> page
                keeps a complete record of every session you have run. Each
                entry captures the task source, provider, duration, cost, and
                final status.
              </p>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Filters &amp; Sorting
                </h3>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <strong className="text-(--sea-ink)">Source</strong> —
                    filter by Trello, GitHub, or GitLab
                  </li>
                  <li>
                    <strong className="text-(--sea-ink)">Status</strong> —
                    show only completed, failed, or cancelled sessions
                  </li>
                  <li>
                    <strong className="text-(--sea-ink)">Sort</strong> — order
                    by date, cost, or duration
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Session Detail View
                </h3>
                <p>
                  Click any session to open the detail view. It shows the full
                  event log — you can replay every step the agent took,
                  including file edits, tool calls, and task source updates.
                  For parallel sessions, use the agent filter dropdown to
                  isolate events from a specific agent.
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Actions
                </h3>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <strong className="text-(--sea-ink)">Delete</strong> —
                    permanently remove a session record
                  </li>
                  <li>
                    <strong className="text-(--sea-ink)">Retry</strong> —
                    re-launch a failed or partially completed session with the
                    same configuration
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Cost Tracking & Analytics ────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Cost Tracking &amp; Analytics
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-(--sea-ink-soft)">
              <p>
                The{" "}
                <strong className="text-(--sea-ink)">/analytics</strong> page
                gives you a clear picture of how your AI spend breaks down
                across sessions, providers, and time.
              </p>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Summary Cards
                </h3>
                <div className="rounded-lg border border-(--line) p-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-(--line)">
                        <th className="pb-2 text-left font-semibold text-(--sea-ink)">
                          Card
                        </th>
                        <th className="pb-2 text-left font-semibold text-(--sea-ink)">
                          Shows
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-(--sea-ink-soft)">
                      <tr className="border-b border-(--line)">
                        <td className="py-1.5">Total Spend</td>
                        <td>Cumulative API cost across all sessions</td>
                      </tr>
                      <tr className="border-b border-(--line)">
                        <td className="py-1.5">Sessions</td>
                        <td>Number of completed, failed, and total sessions</td>
                      </tr>
                      <tr className="border-b border-(--line)">
                        <td className="py-1.5">Tasks Completed</td>
                        <td>
                          Checklist items and issues resolved by the agent
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Tokens Used</td>
                        <td>Total input and output tokens consumed</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Charts
                </h3>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <strong className="text-(--sea-ink)">
                      Daily spend chart
                    </strong>{" "}
                    — bar chart showing cost per day over the selected time range
                  </li>
                  <li>
                    <strong className="text-(--sea-ink)">
                      Provider breakdown
                    </strong>{" "}
                    — pie chart splitting spend by Claude, OpenAI, and Groq
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Monthly Budget
                </h3>
                <p>
                  In{" "}
                  <strong className="text-(--sea-ink)">Settings</strong>, set
                  a monthly budget and an alert threshold (e.g. 80%). When
                  your spend crosses the threshold, a warning banner appears on
                  the dashboard. The analytics page shows a progress bar
                  against your configured budget.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Task Dependencies ────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Task Dependencies
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-(--sea-ink-soft)">
              <p>
                TaskPilot automatically detects dependency markers in card
                descriptions and issue bodies. When the agent encounters
                these markers, it reorders tasks to respect the dependency
                graph.
              </p>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Supported Markers
                </h3>
                <CodeBlock
                  copyText={
                    "Depends on #12\nBlocked by #7"
                  }
                >{`Depends on #12
Blocked by #7`}</CodeBlock>
                <p className="mt-2">
                  Both formats are recognized. The{" "}
                  <code className="rounded border border-(--line) bg-(--surface) px-1 text-xs">
                    #N
                  </code>{" "}
                  refers to the card number (Trello) or issue number
                  (GitHub/GitLab) within the same board or project.
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  How It Works
                </h3>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Tasks are reordered topologically so dependencies are
                    always processed first
                  </li>
                  <li>
                    In parallel mode, an agent will wait for its dependency to
                    finish before starting
                  </li>
                  <li>
                    Circular dependencies are detected and flagged — the
                    session log warns you so you can fix the task descriptions
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  UI Indicators
                </h3>
                <p>
                  Cards and issues with dependencies show{" "}
                  <strong className="text-(--sea-ink)">
                    "Blocked by #N"
                  </strong>{" "}
                  chips on the dashboard. Blocked cards appear dimmed until
                  their dependencies are resolved.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── PR/MR Automation ─────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            PR/MR Automation
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-(--sea-ink-soft)">
              <p>
                TaskPilot can automatically create pull requests (GitHub) or
                merge requests (GitLab) after a session completes. Configure
                this from{" "}
                <strong className="text-(--sea-ink)">
                  Settings &gt; PR Automation
                </strong>
                .
              </p>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Configuration Options
                </h3>
                <div className="rounded-lg border border-(--line) p-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-(--line)">
                        <th className="pb-2 text-left font-semibold text-(--sea-ink)">
                          Option
                        </th>
                        <th className="pb-2 text-left font-semibold text-(--sea-ink)">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-(--sea-ink-soft)">
                      <tr className="border-b border-(--line)">
                        <td className="py-1.5">Enable</td>
                        <td>
                          Toggle PR/MR creation on or off globally
                        </td>
                      </tr>
                      <tr className="border-b border-(--line)">
                        <td className="py-1.5">Draft mode</td>
                        <td>
                          Create PRs/MRs as drafts so you can review before
                          merging
                        </td>
                      </tr>
                      <tr className="border-b border-(--line)">
                        <td className="py-1.5">Auto-link issues</td>
                        <td>
                          Automatically reference the source issue in the
                          PR/MR description with closing keywords
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Branch pattern</td>
                        <td>
                          Template for branch names (e.g.{" "}
                          <code className="rounded border border-(--line) bg-(--surface) px-1 text-xs">
                            taskpilot/issue-{"{{number}}"}
                          </code>
                          )
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Behavior
                </h3>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    After a session finishes, the agent's changes are pushed to
                    a new branch and a PR/MR is created automatically
                  </li>
                  <li>
                    Works with both GitHub (pull requests) and GitLab (merge
                    requests)
                  </li>
                  <li>
                    For Trello-sourced tasks, the PR URL is attached to the
                    card as a comment
                  </li>
                  <li>
                    PR/MR descriptions include a summary of what the agent
                    changed and which tasks were completed
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Real-Time Updates ────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Real-Time Updates
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-(--sea-ink-soft)">
              <p>
                TaskPilot uses webhooks to push task source changes to the UI
                as they happen, so the dashboard stays in sync without manual
                refreshes.
              </p>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Webhook Setup by Source
                </h3>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <strong className="text-(--sea-ink)">Trello</strong> —
                    webhooks are registered automatically when you connect your
                    account. No manual configuration needed.
                  </li>
                  <li>
                    <strong className="text-(--sea-ink)">GitHub</strong> —
                    add a webhook in your repository settings pointing to your
                    TaskPilot instance. Select "Issues" and "Pull request"
                    events.
                  </li>
                  <li>
                    <strong className="text-(--sea-ink)">GitLab</strong> —
                    add a project webhook in Settings &gt; Webhooks pointing to
                    your TaskPilot instance. Enable "Issues events" and "Merge
                    request events".
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Connection Status
                </h3>
                <p>
                  The sidebar shows a connection status dot next to each linked
                  source:
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />{" "}
                    <strong className="text-(--sea-ink)">Green</strong> —
                    webhook active, receiving events
                  </li>
                  <li>
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />{" "}
                    <strong className="text-(--sea-ink)">Amber</strong> —
                    connected but webhook not configured (polling fallback
                    active)
                  </li>
                  <li>
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" />{" "}
                    <strong className="text-(--sea-ink)">Gray</strong> —
                    source not connected
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-(--sea-ink)">
                  Polling Fallback
                </h3>
                <p>
                  When webhooks are unavailable, TaskPilot falls back to
                  polling. During an active session, the board panel polls
                  every 5 seconds. When idle, polling is disabled to minimize
                  API usage.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── What's New ───────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            What's New
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-(--sea-ink-soft)">
              <p>
                The{" "}
                <strong className="text-(--sea-ink)">/updates</strong>{" "}
                changelog page tracks every notable change to TaskPilot.
                Visit it any time to see what has been added, improved, or
                fixed.
              </p>

              <ul className="list-inside list-disc space-y-1">
                <li>
                  A{" "}
                  <strong className="text-(--sea-ink)">
                    notification banner
                  </strong>{" "}
                  appears at the top of the dashboard when there are updates
                  you haven't seen yet
                </li>
                <li>
                  The sidebar shows a{" "}
                  <strong className="text-(--sea-ink)">badge</strong> on the
                  "What's New" link with a count of unread entries
                </li>
                <li>
                  Dismiss the banner or visit the page to mark updates as
                  read
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
