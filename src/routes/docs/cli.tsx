import { createFileRoute } from "@tanstack/react-router";
import {
  Terminal,
  LogIn,
  FolderOpen,
  Play,
  CheckCircle2,
  Settings,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { useState, useCallback } from "react";

export const Route = createFileRoute("/docs/cli")({
  component: CliDocsPage,
  head: () => ({
    meta: [{ title: "CLI Documentation — TaskPilot" }],
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
  const text = copyText ?? (typeof children === "string" ? children : "");

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

function CommandRef({
  command,
  description,
  flags,
}: {
  command: string;
  description: string;
  flags?: Array<{ flag: string; desc: string }>;
}) {
  return (
    <div className="island-shell rounded-xl p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <code className="rounded-md bg-(--code-bg) px-2.5 py-1 text-sm font-semibold text-(--code-text)">
          {command}
        </code>
        <span className="text-sm text-(--sea-ink-soft)">
          {description}
        </span>
      </div>
      {flags && flags.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-(--line) pt-4">
          {flags.map((f) => (
            <div key={f.flag} className="flex items-baseline gap-2 text-sm">
              <code className="shrink-0 text-(--lagoon)">{f.flag}</code>
              <span className="text-(--sea-ink-soft)">{f.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CliDocsPage() {
  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--lagoon) text-white">
              <Terminal size={22} />
            </div>
            <div>
              <span className="island-kicker">Documentation</span>
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-(--sea-ink)">
            CLI Tool
          </h1>
          <p className="text-base text-(--sea-ink-soft)">
            Work through tasks from Trello, GitHub, or GitLab directly from your
            terminal. Choose your AI provider, navigate to any project
            directory, and let the agent work through your tasks — checking off
            items as it goes.
          </p>
          <a
            href="https://www.npmjs.com/package/taskpilot-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-(--shore-line) px-3 py-1.5 text-sm font-semibold text-(--sea-ink) no-underline transition hover:bg-(--foam)"
          >
            View on npm
            <ExternalLink size={14} />
          </a>
        </div>

        {/* ── Install ───────────────────────────────────────────────── */}
        <section className="island-shell mb-6 rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-(--sea-ink)">
            Install
          </h2>
          <p className="mb-3 text-sm text-(--sea-ink-soft)">
            Run instantly with{" "}
            <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs font-semibold">
              npx
            </code>{" "}
            — no install required:
          </p>
          <CodeBlock copyText="npx taskpilot-cli login">
            npx taskpilot-cli login
          </CodeBlock>
          <p className="mt-4 mb-3 text-sm text-(--sea-ink-soft)">
            Or install globally for a shorter command:
          </p>
          <CodeBlock copyText="npm install -g taskpilot-cli">{`npm install -g taskpilot-cli

# Then use anywhere:
taskpilot login
taskpilot run`}</CodeBlock>
        </section>

        {/* ── Prerequisites ────────────────────────────────────────── */}
        <section className="island-shell mb-6 rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-(--sea-ink)">
            Prerequisites
          </h2>
          <ul className="space-y-2 text-sm text-(--sea-ink-soft)">
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-(--lagoon)"
              />
              <span>
                At least one{" "}
                <strong className="text-(--sea-ink)">task source</strong>{" "}
                connected:{" "}
                <strong className="text-(--sea-ink)">Trello</strong>,{" "}
                <strong className="text-(--sea-ink)">GitHub</strong>, or{" "}
                <strong className="text-(--sea-ink)">GitLab</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-(--lagoon)"
              />
              <span>
                At least one{" "}
                <strong className="text-(--sea-ink)">
                  AI provider API key
                </strong>
                :{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--lagoon) hover:underline"
                >
                  Anthropic (Claude)
                </a>
                ,{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--lagoon) hover:underline"
                >
                  OpenAI
                </a>
                , or{" "}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--lagoon) hover:underline"
                >
                  Groq
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-(--lagoon)"
              />
              <span>
                <strong className="text-(--sea-ink)">Node.js 20+</strong>{" "}
                installed
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-(--lagoon)"
              />
              <span>
                <strong className="text-(--sea-ink)">Claude Code</strong>{" "}
                installed (
                <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                  npm i -g @anthropic-ai/claude-code
                </code>
                ) — required only when using the Claude provider
              </span>
            </li>
          </ul>
        </section>

        {/* ── Quick Start ──────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Quick Start
          </h2>
          <p className="mb-4 text-sm text-(--sea-ink-soft)">
            All examples use{" "}
            <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
              npx taskpilot-cli
            </code>
            . If you installed globally, replace with just{" "}
            <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
              taskpilot
            </code>
            .
          </p>
          <div className="space-y-4">
            <StepCard number={1} icon={LogIn} title="Register or sign in">
              <p>Create a new account, or sign in if you already have one:</p>
              <CodeBlock copyText="npx taskpilot-cli register">{`# New user — create an account
npx taskpilot-cli register

# Returning user — sign in
npx taskpilot-cli login`}</CodeBlock>
            </StepCard>

            <StepCard
              number={2}
              icon={Settings}
              title="Connect a task source and API key"
            >
              <p>
                The setup wizard walks you through connecting a task source
                (Trello, GitHub, or GitLab) and saving your AI provider API key:
              </p>
              <CodeBlock copyText="npx taskpilot-cli setup">{`npx taskpilot-cli setup

# TaskPilot — Setup
#
#   1. Trello Not connected
#
# ? Open your browser to connect Trello? Yes
#   Opening: https://trello.com/1/authorize?...
#   ⠋ Waiting for Trello connection...
#   ✓ Trello connected!
#
#   2. API Key Not set
#
#   Get your key from https://console.anthropic.com/settings/keys
#
# ? Paste your API key: sk-ant-api03-••••••
#   ✓ API key saved (encrypted on server)
#
#   All set! Run \`taskpilot run\` to start a session.`}</CodeBlock>
              <p className="text-xs text-(--sea-ink-soft)">
                You can also connect GitHub and GitLab, or add additional AI
                provider keys (OpenAI, Groq) from the web app Settings page.
              </p>
            </StepCard>

            <StepCard
              number={3}
              icon={FolderOpen}
              title="Navigate to your project"
            >
              <p>
                Open your terminal in the codebase you want the agent to work on:
              </p>
              <CodeBlock copyText="cd ~/my-project">cd ~/my-project</CodeBlock>
            </StepCard>

            <StepCard number={4} icon={Play} title="Run a session">
              <p>
                Select a board or repo, review the tasks, and launch an AI
                session:
              </p>
              <CodeBlock copyText="npx taskpilot-cli run">{`npx taskpilot-cli run

# ? Select a board:
# ❯ My Project Board
#   Side Project
#   Personal Tasks
#
# My Project Board
# ─────────────────
#
#   To Do (3 cards):
#     • Fix authentication bug [0/4]
#     • Add dark mode support [0/3]
#     • Update API documentation [0/2]
#
#   In Progress (1 card):
#     • Refactor API layer [1/5]
#
#   Done (2 cards) [skipped]
#
#   Working directory: /home/you/my-project
#
# ? Start Claude Code session? (4 active cards) Yes
#
# ✓ Credentials loaded
# Starting Claude Code session...
#
#   Session initialized (model: claude-sonnet-4-20250514)
#
# I'll start by working on "Fix authentication bug"...
#   [Read]
#   [Edit]
#   ✓ Checked item on Trello
#   ✓ Checked item on Trello
#   ✓ Moved card to Done
# Moving on to "Add dark mode support"...`}</CodeBlock>
            </StepCard>
          </div>
        </section>

        {/* ── Commands Reference ────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-5 text-xl font-bold text-(--sea-ink)">
            Commands
          </h2>
          <div className="space-y-4">
            <CommandRef
              command="npx taskpilot-cli register"
              description="Create a new account (email, password, name)"
              flags={[
                {
                  flag: "-s, --server <url>",
                  desc: "Server URL (default: https://account.task-pilot.dev)",
                },
              ]}
            />
            <CommandRef
              command="npx taskpilot-cli login"
              description="Sign in to an existing account"
              flags={[
                {
                  flag: "-s, --server <url>",
                  desc: "Server URL (default: https://account.task-pilot.dev)",
                },
              ]}
            />
            <CommandRef
              command="npx taskpilot-cli setup"
              description="Connect a task source and save your AI provider API key (interactive wizard)"
            />
            <CommandRef
              command="npx taskpilot-cli logout"
              description="Clear your stored session"
            />
            <CommandRef
              command="npx taskpilot-cli run"
              description="Select a task source and start an AI coding session"
              flags={[
                {
                  flag: "-b, --board <id>",
                  desc: "Board/repo ID — skip interactive selection",
                },
                {
                  flag: "-d, --dir <path>",
                  desc: "Working directory (default: current directory)",
                },
                {
                  flag: "-m, --message <text>",
                  desc: 'Initial instructions for the AI (e.g. "check the dev branch for comparison")',
                },
                {
                  flag: "-s, --source <name>",
                  desc: "Task source: trello, github, or gitlab (default: trello)",
                },
                {
                  flag: "-P, --provider <name>",
                  desc: "AI provider: claude, openai, or groq (default: claude)",
                },
                {
                  flag: "-p, --parallel",
                  desc: "Run one agent per card/issue in parallel (uses git worktrees)",
                },
                {
                  flag: "-c, --concurrency <n>",
                  desc: "Max concurrent agents in parallel mode (1-5, default: 3)",
                },
                {
                  flag: "--pr",
                  desc: "Create a PR/MR after session completes",
                },
                {
                  flag: "--no-pr",
                  desc: "Skip PR/MR creation even if automation is enabled",
                },
                {
                  flag: "--no-deps",
                  desc: "Skip dependency detection, process tasks in original order",
                },
              ]}
            />
            <CommandRef
              command="npx taskpilot-cli boards"
              description="List all your Trello boards with their IDs"
            />
            <CommandRef
              command="npx taskpilot-cli repos"
              description="List your connected GitHub repositories"
            />
            <CommandRef
              command="npx taskpilot-cli status"
              description="Check auth and integration status"
            />
            <CommandRef
              command="npx taskpilot-cli history"
              description="View past AI agent sessions"
              flags={[
                {
                  flag: "--all",
                  desc: "List all sessions",
                },
                {
                  flag: "--source <source>",
                  desc: "Filter: trello, github, gitlab",
                },
                {
                  flag: "--status <status>",
                  desc: "Filter: completed, failed, cancelled",
                },
                {
                  flag: "--events",
                  desc: "Show full event log for a session",
                },
              ]}
            />
            <p className="ml-1 text-sm text-(--sea-ink-soft)">
              Pass a session ID for a detail view:{" "}
              <code className="rounded-md bg-(--code-bg) px-2 py-0.5 text-xs font-semibold text-(--code-text)">
                npx taskpilot-cli history &lt;sessionId&gt;
              </code>
            </p>
            <CommandRef
              command="npx taskpilot-cli usage"
              description="Show current month spending and usage summary"
            />
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            How It Works
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-(--sea-ink-soft)">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--foam) text-xs font-bold text-(--lagoon)">
                  1
                </div>
                <p>
                  <strong className="text-(--sea-ink)">
                    Authenticate
                  </strong>{" "}
                  — The CLI signs in to the web app and stores your session
                  cookie locally. No credentials are stored in plaintext.
                </p>
              </div>
              <div className="flex justify-center">
                <ArrowRight size={16} className="text-(--shore-line)" />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--foam) text-xs font-bold text-(--lagoon)">
                  2
                </div>
                <p>
                  <strong className="text-(--sea-ink)">
                    Fetch task data
                  </strong>{" "}
                  — Boards, cards, and checklists (or GitHub/GitLab issues with
                  task lists) are fetched via the web app's API using your
                  stored connection.
                </p>
              </div>
              <div className="flex justify-center">
                <ArrowRight size={16} className="text-(--shore-line)" />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--foam) text-xs font-bold text-(--lagoon)">
                  3
                </div>
                <p>
                  <strong className="text-(--sea-ink)">
                    Load credentials
                  </strong>{" "}
                  — Your AI provider API key (encrypted in the database) is
                  securely retrieved and decrypted for the session.
                </p>
              </div>
              <div className="flex justify-center">
                <ArrowRight size={16} className="text-(--shore-line)" />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--foam) text-xs font-bold text-(--lagoon)">
                  4
                </div>
                <p>
                  <strong className="text-(--sea-ink)">
                    Run your AI agent locally
                  </strong>{" "}
                  — The AI agent (Claude, OpenAI, or Groq) launches in your
                  working directory with full access to your codebase. It reads,
                  edits, and creates files to complete each task.
                </p>
              </div>
              <div className="flex justify-center">
                <ArrowRight size={16} className="text-(--shore-line)" />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--foam) text-xs font-bold text-(--lagoon)">
                  5
                </div>
                <p>
                  <strong className="text-(--sea-ink)">
                    Update tasks automatically
                  </strong>{" "}
                  — As the agent completes each task, it marks it done on your
                  task source. On Trello, cards move to Done. On GitHub/GitLab,
                  task list items get checked and issues can be closed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Examples ─────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Examples
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                Skip board selection with a board ID
              </h3>
              <p className="mb-3 text-sm text-(--sea-ink-soft)">
                Get the board ID from{" "}
                <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                  npx taskpilot-cli boards
                </code>{" "}
                and pass it directly:
              </p>
              <CodeBlock copyText="npx taskpilot-cli run --board 60d5e2a3f1a2b40017c3d4e5">{`npx taskpilot-cli boards
#   My Project Board  60d5e2a3f1a2b40017c3d4e5
#   Side Project      507f1f77bcf86cd799439011

npx taskpilot-cli run --board 60d5e2a3f1a2b40017c3d4e5`}</CodeBlock>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                Run on a different directory
              </h3>
              <p className="mb-3 text-sm text-(--sea-ink-soft)">
                Point Claude Code at a specific project without navigating there
                first:
              </p>
              <CodeBlock copyText="npx taskpilot-cli run --dir ~/projects/my-api">
                npx taskpilot-cli run --dir ~/projects/my-api
              </CodeBlock>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                Check your connection status
              </h3>
              <p className="mb-3 text-sm text-(--sea-ink-soft)">
                Verify everything is set up correctly before starting a session:
              </p>
              <CodeBlock copyText="npx taskpilot-cli status">{`npx taskpilot-cli status

# TaskPilot — Status
#
#   Server:  https://account.task-pilot.dev
#   Auth:    Signed in as Your Name
#   Trello:  Connected
#   API Key: Configured
#
#   Ready to go! Run \`taskpilot run\` to start.`}</CodeBlock>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                Give the agent extra context with --message
              </h3>
              <p className="mb-3 text-sm text-(--sea-ink-soft)">
                Pass initial instructions so the agent knows how to approach the
                work. Without{" "}
                <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                  --message
                </code>
                , the CLI will prompt you interactively (press Enter to skip).
              </p>
              <CodeBlock
                copyText={
                  'npx taskpilot-cli run --message "Check the development branch for comparison"'
                }
              >{`# Give the agent context before it starts
npx taskpilot-cli run --message "Check the development branch for comparison"

# Or be more specific
npx taskpilot-cli run --message "Focus on the API cards first, skip frontend for now"

# Without --message, you'll be prompted interactively:
# ? Instructions for the AI (optional — press Enter to skip):`}</CodeBlock>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                Work from GitHub or GitLab issues
              </h3>
              <p className="mb-3 text-sm text-(--sea-ink-soft)">
                Use{" "}
                <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                  --source
                </code>{" "}
                to pull tasks from GitHub issues or GitLab issues instead of
                Trello:
              </p>
              <CodeBlock copyText="npx taskpilot-cli run --source github">{`# Work through GitHub issues
npx taskpilot-cli run --source github

# Work through GitLab issues
npx taskpilot-cli run --source gitlab

# List your GitHub repos first
npx taskpilot-cli repos`}</CodeBlock>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                Choose a different AI provider
              </h3>
              <p className="mb-3 text-sm text-(--sea-ink-soft)">
                Switch between Claude, OpenAI, or Groq with{" "}
                <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                  --provider
                </code>
                . You must have the corresponding API key saved in Settings.
              </p>
              <CodeBlock copyText="npx taskpilot-cli run --provider openai">{`# Use OpenAI (gpt-4o) instead of Claude
npx taskpilot-cli run --provider openai

# Use Groq (llama-3.3-70b) for fast inference
npx taskpilot-cli run --provider groq`}</CodeBlock>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                Run agents in parallel
              </h3>
              <p className="mb-3 text-sm text-(--sea-ink-soft)">
                Launch one agent per card/issue simultaneously using isolated
                git worktrees. Changes are merged back sequentially when
                complete.
              </p>
              <CodeBlock copyText="npx taskpilot-cli run --parallel">{`# Run agents in parallel (default: 3 concurrent)
npx taskpilot-cli run --parallel

# Control concurrency (1-5 agents)
npx taskpilot-cli run --parallel --concurrency 5

# Combine with other flags
npx taskpilot-cli run --source github --provider openai --parallel`}</CodeBlock>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                Session History
              </h3>
              <p className="mb-3 text-sm text-(--sea-ink-soft)">
                Review past sessions, filter by source or status, and inspect
                individual session event logs:
              </p>
              <CodeBlock
                copyText={`taskpilot history
taskpilot history --source github --status completed
taskpilot history abc123 --events
taskpilot usage`}
              >{`taskpilot history
taskpilot history --source github --status completed
taskpilot history abc123 --events
taskpilot usage`}</CodeBlock>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                Full scripted workflow
              </h3>
              <p className="mb-3 text-sm text-(--sea-ink-soft)">
                Combine flags for a non-interactive launch:
              </p>
              <CodeBlock
                copyText={
                  'npx taskpilot-cli run --source github --provider claude --parallel --dir ~/projects/my-api --message "Just go"'
                }
              >{`# Login once
npx taskpilot-cli login

# Then run from anywhere with all options
npx taskpilot-cli run \\
  --source github \\
  --provider claude \\
  --parallel \\
  --dir ~/projects/my-api \\
  --message "Just go"`}</CodeBlock>
            </div>
          </div>
        </section>

        {/* ── FAQ / Troubleshooting ────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-(--sea-ink)">
            Troubleshooting
          </h2>
          <div className="space-y-3">
            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-(--sea-ink)">
                "Session expired" error
              </summary>
              <div className="border-t border-(--line) px-5 py-4 text-sm text-(--sea-ink-soft)">
                Your login session has expired. Run{" "}
                <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                  npx taskpilot-cli login
                </code>{" "}
                again to re-authenticate.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-(--sea-ink)">
                "Source not connected" or "API key not configured"
              </summary>
              <div className="border-t border-(--line) px-5 py-4 text-sm text-(--sea-ink-soft)">
                The CLI uses your web app account's integrations. Go to the web
                dashboard Settings page to connect your task source (Trello,
                GitHub, or GitLab) and save the API key for your chosen AI
                provider, then try the CLI again.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-(--sea-ink)">
                Can I use the CLI without the web server running?
              </summary>
              <div className="border-t border-(--line) px-5 py-4 text-sm text-(--sea-ink-soft)">
                The CLI connects to{" "}
                <strong className="text-(--sea-ink)">
                  account.task-pilot.dev
                </strong>{" "}
                by default. If the site is down, the CLI won't work. You can
                also self-host and point at your own instance with{" "}
                <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                  --server
                </code>
                .
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-(--sea-ink)">
                Where is my session stored?
              </summary>
              <div className="border-t border-(--line) px-5 py-4 text-sm text-(--sea-ink-soft)">
                Your session cookie and server URL are stored at{" "}
                <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                  ~/.config/taskpilot/config.json
                </code>{" "}
                with restricted file permissions (
                <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                  600
                </code>
                ). Run{" "}
                <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                  npx taskpilot-cli logout
                </code>{" "}
                to clear it.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-(--sea-ink)">
                Claude asked me a question — what do I do?
              </summary>
              <div className="border-t border-(--line) px-5 py-4 text-sm text-(--sea-ink-soft)">
                Sometimes Claude needs clarification before proceeding. The
                question will appear in yellow in your terminal with a{" "}
                <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                  &gt;
                </code>{" "}
                prompt. Type your answer and press Enter — Claude will continue
                working.
              </div>
            </details>
          </div>
        </section>

        {/* ── Security ─────────────────────────────────────────────── */}
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
                  All API keys are{" "}
                  <strong className="text-(--sea-ink)">
                    encrypted at rest
                  </strong>{" "}
                  (AES-256-GCM) and only decrypted for the duration of a session
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                />
                <span>
                  The local config file is written with{" "}
                  <strong className="text-(--sea-ink)">
                    restricted permissions
                  </strong>{" "}
                  (owner-only read/write)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                />
                <span>
                  Credentials are{" "}
                  <strong className="text-(--sea-ink)">
                    held in memory only
                  </strong>{" "}
                  during a session — never written to disk by the CLI
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                />
                <span>
                  Claude Code runs with{" "}
                  <code className="rounded-md border border-(--line) bg-(--surface) px-1.5 py-0.5 text-xs">
                    acceptEdits
                  </code>{" "}
                  permission mode — it can read and edit files but won't run
                  arbitrary shell commands without approval
                </span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
