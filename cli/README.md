# taskpilot-cli

Point AI coding agents at task boards and work through items from your terminal. Agents read your cards, issues, and checklists, make the code changes, and check items off as they go.

## Quick Start

```bash
npx taskpilot-cli register   # create an account (or `login` if you have one)
npx taskpilot-cli setup      # connect a task source + save your API key
cd ~/my-project
npx taskpilot-cli run        # pick a board/repo and start working
```

Everything happens in your terminal — no web app required.

## What It Does

1. You sign in with your [TaskPilot](https://github.com/JoshJAL/claude-trello) account
2. You pick a task source — a Trello board, GitHub repo, or GitLab project
3. The CLI shows you all active cards/issues and their checklist items
4. An AI coding agent launches locally in your working directory
5. As the agent completes each task, the item gets checked off on your task source
6. When all items on a card are done, the card moves to Done (or the issue is closed)

```
$ npx taskpilot-cli run

? Select a board:
❯ My Project Board
  Side Project

My Project Board
─────────────────

  To Do (3 cards):
    • Fix authentication bug [0/4]
    • Add dark mode support [0/3]
    • Update API docs [0/2]

  In Progress (1 card):
    • Refactor API layer [1/5]

  Done (2 cards) [skipped]

  Working directory: /home/you/my-project

? Start AI session? (4 active cards) Yes

✓ Credentials loaded
Starting session...

  Session initialized (model: claude-sonnet-4-20250514)

I'll start by working on "Fix authentication bug"...
  [Read]
  [Edit]
  ✓ Checked item on Trello
  ✓ Checked item on Trello
  ✓ Moved card to Done
Moving on to "Add dark mode support"...
```

## Install

**Run instantly** with npx (no install needed):

```bash
npx taskpilot-cli login
```

**Or install globally** for a shorter command:

```bash
npm install -g taskpilot-cli

taskpilot login
taskpilot run
```

## Prerequisites

- At least one **task source** connected: **Trello**, **GitHub**, or **GitLab**
- At least one **AI provider API key**: [Anthropic (Claude)](https://console.anthropic.com/settings/keys), [OpenAI](https://platform.openai.com/api-keys), or [Groq](https://console.groq.com/keys)
- **Node.js 20+**
- **Claude Code** installed (`npm i -g @anthropic-ai/claude-code`) — required only when using the Claude provider

## Commands

### `taskpilot-cli register`

Create a new account. You'll be prompted for your name, email, and password.

```bash
npx taskpilot-cli register
npx taskpilot-cli register --server https://your-self-hosted-instance.com
```

| Flag | Description |
|------|-------------|
| `-s, --server <url>` | Server URL (default: `https://account.task-pilot.dev`) |

### `taskpilot-cli login`

Sign in with your email and password. Your session is stored at `~/.config/taskpilot/config.json` with restricted file permissions.

```bash
npx taskpilot-cli login
npx taskpilot-cli login --server https://your-app.vercel.app
```

| Flag | Description |
|------|-------------|
| `-s, --server <url>` | Server URL (default: `https://account.task-pilot.dev`) |

### `taskpilot-cli setup`

Interactive wizard that walks you through connecting a task source and saving your AI provider API key. Opens your browser for OAuth authorization and polls until complete.

```bash
npx taskpilot-cli setup
```

### `taskpilot-cli run`

The main command. Select a task source and board/repo interactively, review the tasks, and launch an AI coding session.

```bash
npx taskpilot-cli run
npx taskpilot-cli run --board 60d5e2a3f1a2b40017c3d4e5
npx taskpilot-cli run --source github
npx taskpilot-cli run --provider openai
npx taskpilot-cli run --parallel --concurrency 5
npx taskpilot-cli run --dir ~/projects/my-api
npx taskpilot-cli run --message "Check the development branch for comparison"
```

Without `--message`, you'll be prompted interactively before the session starts. Press Enter to skip.

| Flag | Description |
|------|-------------|
| `-b, --board <id>` | Board/repo ID — skip interactive selection |
| `-d, --dir <path>` | Working directory (default: current directory) |
| `-m, --message <text>` | Initial instructions for the agent (e.g. "focus on API cards first") |
| `-s, --source <name>` | Task source: `trello`, `github`, or `gitlab` (default: `trello`) |
| `-P, --provider <name>` | AI provider: `claude`, `openai`, or `groq` (default: `claude`) |
| `-p, --parallel` | Run one agent per card/issue in parallel (uses git worktrees) |
| `-c, --concurrency <n>` | Max concurrent agents in parallel mode (1-5, default: 3) |

### `taskpilot-cli boards`

List all your Trello boards with their IDs. Useful for grabbing a board ID to pass to `run --board`.

```bash
npx taskpilot-cli boards

# Your Trello Boards (3):
#
#   My Project Board  60d5e2a3f1a2b40017c3d4e5
#   Side Project      507f1f77bcf86cd799439011
#   Personal Tasks    612a3b4c5d6e7f8a9b0c1d2e
```

### `taskpilot-cli repos`

List your connected GitHub repositories.

```bash
npx taskpilot-cli repos

# 5 repositories:
#
#   user/my-app
#     Full-stack web application
#   user/api-service (private)
#     Backend API
```

### `taskpilot-cli status`

Check your auth and integration status.

```bash
npx taskpilot-cli status

# TaskPilot — Status
#
#   Server:  https://account.task-pilot.dev
#   Auth:    Signed in as Your Name
#   Trello:  Connected
#   API Key: Configured
#
#   Ready to go! Run `taskpilot run` to start.
```

### `taskpilot-cli logout`

Clear your stored session.

```bash
npx taskpilot-cli logout
```

## Task Sources

TaskPilot supports three task sources. Connect them via the web app Settings or during `setup`:

| Source | Tasks come from | Completion action |
|--------|----------------|-------------------|
| **Trello** | Cards with checklists | Checks off items, moves cards to Done |
| **GitHub** | Issues with task lists (`- [ ]`) | Checks off tasks, can close issues and create PRs |
| **GitLab** | Issues with task lists (`- [ ]`) | Checks off tasks, can close issues and create MRs |

```bash
# Trello (default)
npx taskpilot-cli run

# GitHub
npx taskpilot-cli run --source github

# GitLab
npx taskpilot-cli run --source gitlab
```

## AI Providers

Choose which AI model powers your coding agent. Each provider requires its own API key saved in Settings.

| Provider | Model | Key prefix | Best for |
|----------|-------|-----------|----------|
| **Claude** (default) | Claude via Claude Code SDK | `sk-ant-api03-` | Most capable, native tool use |
| **OpenAI** | `gpt-4o` | `sk-` | Alternative with strong coding |
| **Groq** | `llama-3.3-70b-versatile` | `gsk_` | Fast inference |

```bash
# Claude (default)
npx taskpilot-cli run

# OpenAI
npx taskpilot-cli run --provider openai

# Groq
npx taskpilot-cli run --provider groq
```

## Parallel Mode

Run one agent per card/issue simultaneously. Each agent works in an isolated git worktree, and changes are merged back sequentially when complete.

```bash
# Default: 3 concurrent agents
npx taskpilot-cli run --parallel

# Up to 5 concurrent agents
npx taskpilot-cli run --parallel --concurrency 5

# Combine with any source and provider
npx taskpilot-cli run --source github --provider openai --parallel
```

**Safety limits:**
- Max 5 concurrent agents
- Per-agent cost budget ($2 default for Claude)
- One parallel session per user at a time
- Merge conflicts are detected and reported in the summary

## How It Works

```
Your Terminal                    Web App Server              Task Source API
     │                               │                          │
     │  1. login (email/password)    │                          │
     │──────────────────────────────>│                          │
     │         session cookie        │                          │
     │<──────────────────────────────│                          │
     │                               │                          │
     │  2. run → fetch tasks         │   GET boards/repos/etc.  │
     │──────────────────────────────>│─────────────────────────>│
     │         task list             │         tasks            │
     │<──────────────────────────────│<─────────────────────────│
     │                               │                          │
     │  3. fetch credentials         │                          │
     │──────────────────────────────>│                          │
     │   tasks, API key, token       │                          │
     │<──────────────────────────────│                          │
     │                               │                          │
     │  4. Launch AI agent locally                              │
     │  ┌─────────────────────┐                                 │
     │  │ Agent reads/edits   │                                 │
     │  │ your codebase       │                                 │
     │  │                     │  5. check task item              │
     │  │ Task complete ──────│────────────────────────────────>│
     │  │                     │  6. close/move card              │
     │  │ Card complete ──────│────────────────────────────────>│
     │  └─────────────────────┘                                 │
```

1. **Authenticate** — Signs in to the web app, stores a session cookie locally
2. **Fetch task data** — Gets your boards/repos, cards/issues, and checklists via the web app's API
3. **Load credentials** — Your encrypted API key is decrypted server-side and sent once for the session
4. **Run AI agent locally** — Launches in your working directory with full codebase access
5. **Update tasks** — As the agent finishes each item, it calls the task source API to check it off
6. **Complete cards** — When all items on a card are done, the card moves to Done (or the issue is closed)

## Security

- Your **API keys are encrypted at rest** (AES-256-GCM) in the web app's database and only decrypted for the duration of a session
- The local config file is written with **restricted permissions** (`600` — owner-only read/write)
- API credentials are **held in memory only** during a session — never written to disk by the CLI
- Claude Code runs with `acceptEdits` permission mode — it can read and edit files but requires approval for shell commands

## Troubleshooting

**"Session expired" error**
Run `npx taskpilot-cli login` again to re-authenticate.

**"Source not connected" or "API key not configured"**
The CLI uses your web app account's integrations. Go to the web dashboard Settings page, connect your task source (Trello/GitHub/GitLab) and save your AI provider API key, then try the CLI again.

**Can I use the CLI without the web server running?**
No — the CLI authenticates against and fetches data from the web app. You need either a local dev server or a deployed instance running.

**Claude asked me a question — what do I do?**
Sometimes the agent needs clarification. The question appears in yellow with a `>` prompt. Type your answer and press Enter — the agent will continue working.

**Parallel mode has merge conflicts**
When running in parallel, each agent works in an isolated git worktree. If two agents modify the same files, a merge conflict may occur. The summary report will flag these — resolve them manually after the session.

## License

MIT
