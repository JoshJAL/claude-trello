import { createFileRoute } from "@tanstack/react-router";
import {
  Terminal,
  LogIn,
  FolderOpen,
  Play,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { useState, useCallback } from "react";

export const Route = createFileRoute("/docs/cli")({
  component: CliDocsPage,
  head: () => ({
    meta: [{ title: "CLI Documentation — Claude Trello Bridge" }],
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
      className="absolute right-2 top-2 rounded-md border border-[var(--shore-line)] bg-[var(--surface)] p-1.5 text-[var(--sea-ink-soft)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--sea-ink)]"
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
    (typeof children === "string"
      ? children
      : "");

  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--sea-ink)] p-4 text-sm leading-relaxed text-[var(--sand)]">
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
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex items-baseline gap-3">
        <code className="rounded-md bg-[var(--sea-ink)] px-2.5 py-1 text-sm font-semibold text-[var(--sand)]">
          {command}
        </code>
        <span className="text-sm text-[var(--sea-ink-soft)]">
          {description}
        </span>
      </div>
      {flags && flags.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3">
          {flags.map((f) => (
            <div key={f.flag} className="flex items-baseline gap-2 text-sm">
              <code className="shrink-0 text-[var(--lagoon)]">{f.flag}</code>
              <span className="text-[var(--sea-ink-soft)]">{f.desc}</span>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lagoon)] text-white">
              <Terminal size={22} />
            </div>
            <div>
              <span className="island-kicker">Documentation</span>
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-[var(--sea-ink)]">
            CLI Tool
          </h1>
          <p className="text-base text-[var(--sea-ink-soft)]">
            Work through Trello boards with Claude Code directly from your
            terminal. Navigate to any project directory, pick a board, and let
            Claude work through your tasks — checking off items as it goes.
          </p>
          <a
            href="https://www.npmjs.com/package/claude-trello-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--shore-line)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:bg-[var(--foam)]"
          >
            View on npm
            <ExternalLink size={14} />
          </a>
        </div>

        {/* ── Install ───────────────────────────────────────────────── */}
        <section className="island-shell mb-6 rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
            Install
          </h2>
          <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
            Run instantly with{" "}
            <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs font-semibold">
              npx
            </code>{" "}
            — no install required:
          </p>
          <CodeBlock copyText="npx claude-trello-cli login">
            npx claude-trello-cli login
          </CodeBlock>
          <p className="mt-4 mb-3 text-sm text-[var(--sea-ink-soft)]">
            Or install globally for a shorter command:
          </p>
          <CodeBlock copyText="npm install -g claude-trello-cli">{`npm install -g claude-trello-cli

# Then use anywhere:
claude-trello login
claude-trello run`}</CodeBlock>
        </section>

        {/* ── Prerequisites ────────────────────────────────────────── */}
        <section className="island-shell mb-6 rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
            Prerequisites
          </h2>
          <ul className="space-y-2 text-sm text-[var(--sea-ink-soft)]">
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-[var(--lagoon)]"
              />
              <span>
                An account on this app with{" "}
                <strong className="text-[var(--sea-ink)]">
                  Trello connected
                </strong>{" "}
                and an{" "}
                <strong className="text-[var(--sea-ink)]">
                  Anthropic API key
                </strong>{" "}
                saved (complete onboarding first)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-[var(--lagoon)]"
              />
              <span>
                <strong className="text-[var(--sea-ink)]">Node.js 20+</strong>{" "}
                installed
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-[var(--lagoon)]"
              />
              <span>
                <strong className="text-[var(--sea-ink)]">Claude Code</strong>{" "}
                installed (
                <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
                  npm i -g @anthropic-ai/claude-code
                </code>
                )
              </span>
            </li>
          </ul>
        </section>

        {/* ── Quick Start ──────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            Quick Start
          </h2>
          <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
            All examples use{" "}
            <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
              npx claude-trello-cli
            </code>
            . If you installed globally, replace with just{" "}
            <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
              claude-trello
            </code>
            .
          </p>
          <div className="space-y-4">
            <StepCard number={1} icon={LogIn} title="Sign in">
              <p>
                Authenticate with the same email and password you use on the web
                app. Your session is stored locally at{" "}
                <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
                  ~/.config/claude-trello/
                </code>
              </p>
              <CodeBlock
                copyText="npx claude-trello-cli login"
              >{`npx claude-trello-cli login

# Sign in to Claude Trello Bridge
# Server: https://ct.joshualevine.me
#
# ? Email: you@example.com
# ? Password: ********
# ✓ Signed in as Your Name (you@example.com)`}</CodeBlock>
              <p>
                Connecting to a deployed server? Use the{" "}
                <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
                  --server
                </code>{" "}
                flag:
              </p>
              <CodeBlock copyText="npx claude-trello-cli login --server https://your-app.vercel.app">
                npx claude-trello-cli login --server https://your-app.vercel.app
              </CodeBlock>
            </StepCard>

            <StepCard number={2} icon={FolderOpen} title="Navigate to your project">
              <p>
                Open your terminal in the codebase you want Claude to work on:
              </p>
              <CodeBlock copyText="cd ~/my-project">cd ~/my-project</CodeBlock>
            </StepCard>

            <StepCard
              number={3}
              icon={Play}
              title="Run a session"
            >
              <p>
                Select a Trello board, review the cards, and launch Claude Code:
              </p>
              <CodeBlock
                copyText="npx claude-trello-cli run"
              >{`npx claude-trello-cli run

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
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            Commands
          </h2>
          <div className="space-y-3">
            <CommandRef
              command="npx claude-trello-cli login"
              description="Sign in with your email and password"
              flags={[
                {
                  flag: "-s, --server <url>",
                  desc: "Server URL (default: https://ct.joshualevine.me)",
                },
              ]}
            />
            <CommandRef
              command="npx claude-trello-cli logout"
              description="Clear your stored session"
            />
            <CommandRef
              command="npx claude-trello-cli run"
              description="Select a board and start a Claude Code session"
              flags={[
                {
                  flag: "-b, --board <id>",
                  desc: "Board ID — skip interactive selection",
                },
                {
                  flag: "-d, --dir <path>",
                  desc: "Working directory (default: current directory)",
                },
              ]}
            />
            <CommandRef
              command="npx claude-trello-cli boards"
              description="List all your Trello boards with their IDs"
            />
            <CommandRef
              command="npx claude-trello-cli status"
              description="Check auth and integration status"
            />
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            How It Works
          </h2>
          <div className="island-shell rounded-2xl p-6">
            <div className="space-y-4 text-sm text-[var(--sea-ink-soft)]">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--foam)] text-xs font-bold text-[var(--lagoon)]">
                  1
                </div>
                <p>
                  <strong className="text-[var(--sea-ink)]">
                    Authenticate
                  </strong>{" "}
                  — The CLI signs in to the web app and stores your session
                  cookie locally. No credentials are stored in plaintext.
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
                    Fetch board data
                  </strong>{" "}
                  — Boards, cards, and checklists are fetched via the web app's
                  API using your stored Trello connection.
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
                    Load credentials
                  </strong>{" "}
                  — Your Anthropic API key (encrypted in the database) is
                  securely retrieved and decrypted for the session.
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
                    Run Claude Code locally
                  </strong>{" "}
                  — Claude Code launches in your working directory with full
                  access to your codebase. It reads, edits, and creates files to
                  complete each task.
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
                    Update Trello automatically
                  </strong>{" "}
                  — As Claude completes each checklist item, it marks it done on
                  Trello. When all items on a card are finished, the card moves
                  to your Done list.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Examples ─────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            Examples
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">
                Skip board selection with a board ID
              </h3>
              <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
                Get the board ID from{" "}
                <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
                  npx claude-trello-cli boards
                </code>{" "}
                and pass it directly:
              </p>
              <CodeBlock copyText='npx claude-trello-cli run --board 60d5e2a3f1a2b40017c3d4e5'>{`npx claude-trello-cli boards
#   My Project Board  60d5e2a3f1a2b40017c3d4e5
#   Side Project      507f1f77bcf86cd799439011

npx claude-trello-cli run --board 60d5e2a3f1a2b40017c3d4e5`}</CodeBlock>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">
                Run on a different directory
              </h3>
              <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
                Point Claude Code at a specific project without navigating there
                first:
              </p>
              <CodeBlock copyText="npx claude-trello-cli run --dir ~/projects/my-api">
                npx claude-trello-cli run --dir ~/projects/my-api
              </CodeBlock>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">
                Check your connection status
              </h3>
              <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
                Verify everything is set up correctly before starting a session:
              </p>
              <CodeBlock
                copyText="npx claude-trello-cli status"
              >{`npx claude-trello-cli status

# Claude Trello Bridge — Status
#
#   Server:  https://ct.joshualevine.me
#   Auth:    Signed in as Your Name
#   Trello:  Connected
#   API Key: Configured
#
#   Ready to go! Run \`claude-trello run\` to start.`}</CodeBlock>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--sea-ink)]">
                Full scripted workflow
              </h3>
              <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
                Combine flags for a non-interactive launch:
              </p>
              <CodeBlock
                copyText="npx claude-trello-cli run --board 60d5e2a3f1a2b40017c3d4e5 --dir ~/projects/my-api"
              >{`# Login once
npx claude-trello-cli login --server https://your-app.vercel.app

# Then run from anywhere
npx claude-trello-cli run --board 60d5e2a3f1a2b40017c3d4e5 --dir ~/projects/my-api`}</CodeBlock>
            </div>
          </div>
        </section>

        {/* ── FAQ / Troubleshooting ────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">
            Troubleshooting
          </h2>
          <div className="space-y-3">
            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
                "Session expired" error
              </summary>
              <div className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--sea-ink-soft)]">
                Your login session has expired. Run{" "}
                <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
                  npx claude-trello-cli login
                </code>{" "}
                again to re-authenticate.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
                "Trello not connected" or "API key not configured"
              </summary>
              <div className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--sea-ink-soft)]">
                The CLI uses your web app account's integrations. Go to the web
                dashboard, complete onboarding (connect Trello and save your
                Anthropic API key), then try the CLI again.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
                Can I use the CLI without the web server running?
              </summary>
              <div className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--sea-ink-soft)]">
                The CLI connects to{" "}
                <strong className="text-[var(--sea-ink)]">
                  ct.joshualevine.me
                </strong>{" "}
                by default. If the site is down, the CLI won't work. You can
                also self-host and point at your own instance with{" "}
                <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
                  --server
                </code>
                .
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
                Where is my session stored?
              </summary>
              <div className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--sea-ink-soft)]">
                Your session cookie and server URL are stored at{" "}
                <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
                  ~/.config/claude-trello/config.json
                </code>{" "}
                with restricted file permissions (
                <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
                  600
                </code>
                ). Run{" "}
                <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
                  npx claude-trello-cli logout
                </code>{" "}
                to clear it.
              </div>
            </details>

            <details className="island-shell rounded-xl">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
                Claude asked me a question — what do I do?
              </summary>
              <div className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--sea-ink-soft)]">
                Sometimes Claude needs clarification before proceeding. The
                question will appear in yellow in your terminal with a{" "}
                <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
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
                  Your Anthropic API key is{" "}
                  <strong className="text-[var(--sea-ink)]">
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
                  <strong className="text-[var(--sea-ink)]">
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
                  <strong className="text-[var(--sea-ink)]">
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
                  <code className="rounded bg-[var(--foam)] px-1.5 py-0.5 text-xs">
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
