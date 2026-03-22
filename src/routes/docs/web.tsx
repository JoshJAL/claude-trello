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
      <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--code-bg)] p-5 text-sm leading-relaxed text-[var(--code-text)]">
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
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lagoon)] text-sm font-bold text-white">
          {number}
        </span>
        <Icon size={20} className="text-[var(--lagoon)]" />
        <h3 className="text-base font-semibold text-[var(--sea-ink)]">
          {title}
        </h3>
      </div>
      <div className="ml-11 space-y-3 text-sm text-[var(--sea-ink-soft)]">
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
        <Icon size={18} className="text-[var(--lagoon)]" />
        <h3 className="text-sm font-semibold text-[var(--sea-ink)]">
          {title}
        </h3>
      </div>
      <div className="text-sm text-[var(--sea-ink-soft)]">{children}</div>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lagoon)] text-white">
              <Globe size={22} />
            </div>
            <div>
              <span className="island-kicker">Documentation</span>
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-[var(--sea-ink)]">
            Web App
          </h1>
          <p className="text-base text-[var(--sea-ink-soft)]">
            The TaskPilot web app is your control center. Connect task sources,
            configure AI providers, and launch coding sessions — all from
            your browser.
          </p>
        </div>

        {/* ── Overview ────────────────────────────────────────────── */}
        <section className="island-shell mb-6 rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
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
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
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
                  <strong className="text-[var(--sea-ink)]">Trello</strong> —
                  click "Connect Trello" to authorize via OAuth
                </li>
                <li>
                  <strong className="text-[var(--sea-ink)]">GitHub</strong> —
                  click "Connect GitHub" to authorize via OAuth
                </li>
                <li>
                  <strong className="text-[var(--sea-ink)]">GitLab</strong> —
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
              <div className="rounded-lg border border-[var(--line)] p-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th className="pb-2 text-left font-semibold text-[var(--sea-ink)]">
                        Provider
                      </th>
                      <th className="pb-2 text-left font-semibold text-[var(--sea-ink)]">
                        Key prefix
                      </th>
                      <th className="pb-2 text-left font-semibold text-[var(--sea-ink)]">
                        Where to get it
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--sea-ink-soft)]">
                    <tr className="border-b border-[var(--line)]">
                      <td className="py-1.5">Claude</td>
                      <td>
                        <code className="text-xs">sk-ant-api03-</code>
                      </td>
                      <td>
                        <a
                          href="https://console.anthropic.com/settings/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--lagoon)] hover:underline"
                        >
                          console.anthropic.com
                        </a>
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--line)]">
                      <td className="py-1.5">OpenAI</td>
                      <td>
                        <code className="text-xs">sk-</code>
                      </td>
                      <td>
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--lagoon)] hover:underline"
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
                          className="text-[var(--lagoon)] hover:underline"
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
                <strong className="text-[var(--sea-ink)]">Start Session</strong>{" "}
                to begin.
              </p>
            </StepCard>
          </div>
        </section>

        {/* ── Dashboard ──────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            Dashboard
          </h2>
          <div className="space-y-4">
            <div className="island-shell rounded-2xl p-6">
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--sea-ink)]">
                <Trello size={18} className="text-[var(--lagoon)]" />
                Trello
              </h3>
              <div className="space-y-2 text-sm text-[var(--sea-ink-soft)]">
                <p>
                  Navigate to{" "}
                  <strong className="text-[var(--sea-ink)]">Trello</strong> in
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
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--sea-ink)]">
                <Github size={18} className="text-[var(--lagoon)]" />
                GitHub
              </h3>
              <div className="space-y-2 text-sm text-[var(--sea-ink-soft)]">
                <p>
                  Navigate to{" "}
                  <strong className="text-[var(--sea-ink)]">GitHub</strong> in
                  the sidebar to browse your repositories. Select a repo to view
                  its open issues.
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Issues with markdown task lists (
                    <code className="rounded border border-[var(--line)] bg-[var(--surface)] px-1 text-xs">
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
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--sea-ink)]">
                <Gitlab size={18} className="text-[var(--lagoon)]" />
                GitLab
              </h3>
              <div className="space-y-2 text-sm text-[var(--sea-ink-soft)]">
                <p>
                  Navigate to{" "}
                  <strong className="text-[var(--sea-ink)]">GitLab</strong> in
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
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            Running a Session
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-[var(--sea-ink-soft)]">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--foam)] text-xs font-bold text-[var(--lagoon)]">
                  1
                </div>
                <p>
                  <strong className="text-[var(--sea-ink)]">
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
                  className="text-[var(--shore-line)]"
                />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--foam)] text-xs font-bold text-[var(--lagoon)]">
                  2
                </div>
                <p>
                  <strong className="text-[var(--sea-ink)]">
                    Choose a mode
                  </strong>{" "}
                  — Select{" "}
                  <strong className="text-[var(--sea-ink)]">Sequential</strong>{" "}
                  (one card at a time) or{" "}
                  <strong className="text-[var(--sea-ink)]">Parallel</strong>{" "}
                  (one agent per card, running concurrently in isolated git
                  worktrees). Adjust the concurrency slider if using parallel
                  mode.
                </p>
              </div>
              <div className="flex justify-center">
                <ArrowRight
                  size={16}
                  className="text-[var(--shore-line)]"
                />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--foam)] text-xs font-bold text-[var(--lagoon)]">
                  3
                </div>
                <p>
                  <strong className="text-[var(--sea-ink)]">
                    Pick your AI provider
                  </strong>{" "}
                  — If you have multiple provider keys configured, a dropdown
                  lets you choose which model to use. Defaults to Claude.
                </p>
              </div>
              <div className="flex justify-center">
                <ArrowRight
                  size={16}
                  className="text-[var(--shore-line)]"
                />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--foam)] text-xs font-bold text-[var(--lagoon)]">
                  4
                </div>
                <p>
                  <strong className="text-[var(--sea-ink)]">
                    Start the session
                  </strong>{" "}
                  — Click{" "}
                  <strong className="text-[var(--sea-ink)]">
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
                  className="text-[var(--shore-line)]"
                />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--foam)] text-xs font-bold text-[var(--lagoon)]">
                  5
                </div>
                <p>
                  <strong className="text-[var(--sea-ink)]">
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
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            Parallel Mode
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-3 text-sm text-[var(--sea-ink-soft)]">
              <p>
                Parallel mode launches{" "}
                <strong className="text-[var(--sea-ink)]">
                  one agent per card or issue
                </strong>
                , each in an isolated git worktree. This lets multiple tasks be
                worked on simultaneously without conflicts.
              </p>
              <div className="rounded-lg border border-[var(--line)] p-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th className="pb-2 text-left font-semibold text-[var(--sea-ink)]">
                        Setting
                      </th>
                      <th className="pb-2 text-left font-semibold text-[var(--sea-ink)]">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--sea-ink-soft)]">
                    <tr className="border-b border-[var(--line)]">
                      <td className="py-1.5">Max concurrency</td>
                      <td>1 to 5 agents (default: 3)</td>
                    </tr>
                    <tr className="border-b border-[var(--line)]">
                      <td className="py-1.5">Per-agent cost budget</td>
                      <td>$2 (Claude provider)</td>
                    </tr>
                    <tr className="border-b border-[var(--line)]">
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
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            Settings
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-[var(--sea-ink-soft)]">
              <p>
                The{" "}
                <strong className="text-[var(--sea-ink)]">Settings</strong> page
                (accessible from the sidebar) lets you manage all your
                connections and API keys at any time.
              </p>

              <div>
                <h3 className="mb-2 font-semibold text-[var(--sea-ink)]">
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
                <h3 className="mb-2 font-semibold text-[var(--sea-ink)]">
                  AI Provider Keys
                </h3>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Add or remove API keys for Claude, OpenAI, and Groq
                  </li>
                  <li>
                    Keys are validated by prefix before saving (e.g.{" "}
                    <code className="rounded border border-[var(--line)] bg-[var(--surface)] px-1 text-xs">
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
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
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
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            Task Format by Source
          </h2>
          <div className="space-y-4">
            <div className="island-shell rounded-xl p-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
                <Trello size={16} className="text-[var(--lagoon)]" />
                Trello
              </h3>
              <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
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
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
                <Github size={16} className="text-[var(--lagoon)]" />
                GitHub / <Gitlab size={16} className="text-[var(--lagoon)]" />{" "}
                GitLab
              </h3>
              <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
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
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            Troubleshooting
          </h2>
          <div className="space-y-3">
            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
                I connected Trello/GitHub/GitLab but no boards or repos appear
              </summary>
              <div className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--sea-ink-soft)]">
                Make sure your OAuth token hasn't expired. Go to{" "}
                <strong className="text-[var(--sea-ink)]">Settings</strong>,
                disconnect the source, and reconnect it. For GitHub, ensure the
                OAuth app has access to the repos you expect (check your GitHub
                OAuth app permissions).
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
                The session started but nothing is happening
              </summary>
              <div className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--sea-ink-soft)]">
                Check that your AI provider API key is valid and has sufficient
                credits. Go to{" "}
                <strong className="text-[var(--sea-ink)]">Settings</strong> to
                verify your key is configured. If using Claude, make sure you
                have{" "}
                <code className="rounded border border-[var(--line)] bg-[var(--surface)] px-1 text-xs">
                  @anthropic-ai/claude-code
                </code>{" "}
                installed globally on the server.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
                Can I run multiple sessions at the same time?
              </summary>
              <div className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--sea-ink-soft)]">
                Each user is limited to one active session at a time. Wait for
                the current session to finish, or stop it before starting
                another. In parallel mode, the concurrency limit controls how
                many agents run simultaneously within a single session.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
                Parallel mode has merge conflicts
              </summary>
              <div className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--sea-ink-soft)]">
                When multiple agents edit the same files, merge conflicts can
                occur during the sequential merge phase. The summary panel will
                flag these. Resolve them manually in your working directory after
                the session finishes.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
                The provider dropdown only shows Claude
              </summary>
              <div className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--sea-ink-soft)]">
                The dropdown only appears when you have two or more provider keys
                configured. Go to{" "}
                <strong className="text-[var(--sea-ink)]">Settings</strong> and
                add API keys for OpenAI or Groq to see additional options.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
                Where is my data stored?
              </summary>
              <div className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--sea-ink-soft)]">
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
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            Security
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <ul className="space-y-3 text-sm text-[var(--sea-ink-soft)]">
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                />
                <span>
                  <strong className="text-[var(--sea-ink)]">
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
                  <strong className="text-[var(--sea-ink)]">
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
                  <strong className="text-[var(--sea-ink)]">
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
                  <strong className="text-[var(--sea-ink)]">
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
                  <strong className="text-[var(--sea-ink)]">
                    All server functions authenticated
                  </strong>{" "}
                  — every API route checks the session before accessing
                  user-specific data
                </span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
