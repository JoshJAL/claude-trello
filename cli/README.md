# taskpilot-cli

Point AI coding agents at task boards and work through items from your terminal. Agents read your cards and checklists, make the code changes, and check items off as they go.

## Quick Start

```bash
npx taskpilot-cli register   # create an account (or `login` if you have one)
npx taskpilot-cli setup      # connect Trello + save your API key
cd ~/my-project
npx taskpilot-cli run        # pick a board and start working
```

Everything happens in your terminal — no web app required.

## What It Does

1. You sign in with your [TaskPilot](https://github.com/JoshJAL/claude-trello) account
2. You pick a Trello board from your connected boards
3. The CLI shows you all active cards and their checklist items
4. An AI coding agent launches locally in your working directory
5. As the agent completes each task, the checklist item gets checked off on Trello
6. When all items on a card are done, the card moves to your Done list

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

? Start Claude Code session? (4 active cards) Yes

✓ Credentials loaded
Starting Claude Code session...

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

- **A Trello account** — you'll connect it during `setup`
- **An Anthropic API key** — get one from [console.anthropic.com](https://console.anthropic.com/settings/keys)
- **Node.js 20+**

## Commands

### `taskpilot-cli register`

Create a new account. You'll be prompted for your name, email, and password.

```bash
npx taskpilot-cli register
npx taskpilot-cli register --server https://your-self-hosted-instance.com
```

| Flag | Description |
|------|-------------|
| `-s, --server <url>` | Server URL (default: `https://ct.joshualevine.me`) |

### `taskpilot-cli login`

Sign in with your email and password. Your session is stored at `~/.config/taskpilot/config.json` with restricted file permissions.

```bash
npx taskpilot-cli login
npx taskpilot-cli login --server https://your-app.vercel.app
```

| Flag | Description |
|------|-------------|
| `-s, --server <url>` | Server URL (default: `https://ct.joshualevine.me`) |

### `taskpilot-cli setup`

Interactive wizard that walks you through connecting Trello and saving your Anthropic API key. Opens your browser for Trello authorization and polls until complete.

```bash
npx taskpilot-cli setup
```

### `taskpilot-cli run`

The main command. Select a board interactively, review the cards, and launch an AI coding session.

```bash
npx taskpilot-cli run
npx taskpilot-cli run --board 60d5e2a3f1a2b40017c3d4e5
npx taskpilot-cli run --dir ~/projects/my-api
npx taskpilot-cli run --message "Check the development branch for comparison"
```

Without `--message`, you'll be prompted interactively before the session starts. Press Enter to skip.

| Flag | Description |
|------|-------------|
| `-b, --board <id>` | Board ID — skip interactive selection |
| `-d, --dir <path>` | Working directory (default: current directory) |
| `-m, --message <text>` | Initial instructions for the agent (e.g. "focus on API cards first") |

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

### `taskpilot-cli status`

Check your auth and integration status.

```bash
npx taskpilot-cli status

# TaskPilot — Status
#
#   Server:  https://ct.joshualevine.me
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

## How It Works

```
Your Terminal                    Web App Server              Trello API
     │                               │                          │
     │  1. login (email/password)    │                          │
     │──────────────────────────────>│                          │
     │         session cookie        │                          │
     │<──────────────────────────────│                          │
     │                               │                          │
     │  2. run → fetch boards        │   GET /members/me/boards │
     │──────────────────────────────>│─────────────────────────>│
     │         board list            │         boards           │
     │<──────────────────────────────│<─────────────────────────│
     │                               │                          │
     │  3. fetch cards + credentials │                          │
     │──────────────────────────────>│                          │
     │   cards, API key, token       │                          │
     │<──────────────────────────────│                          │
     │                               │                          │
     │  4. Launch AI agent locally                              │
     │  ┌─────────────────────┐                                 │
     │  │ Agent reads/edits   │                                 │
     │  │ your codebase       │                                 │
     │  │                     │  5. check_trello_item           │
     │  │ Task complete ──────│────────────────────────────────>│
     │  │                     │  6. move_card_to_done           │
     │  │ Card complete ──────│────────────────────────────────>│
     │  └─────────────────────┘                                 │
```

1. **Authenticate** — Signs in to the web app, stores a session cookie locally
2. **Fetch board data** — Gets your boards, cards, and checklists via the web app's API
3. **Load credentials** — Your encrypted API key is decrypted server-side and sent once for the session
4. **Run AI agent locally** — Launches in your working directory with full codebase access
5. **Update Trello** — As the agent finishes each checklist item, it calls the Trello API directly to check it off
6. **Move cards** — When all items on a card are done, the card moves to your Done list

## Security

- Your **API keys are encrypted at rest** (AES-256-GCM) in the web app's database and only decrypted for the duration of a session
- The local config file is written with **restricted permissions** (`600` — owner-only read/write)
- API credentials are **held in memory only** during a session — never written to disk by the CLI
- Claude Code runs with `acceptEdits` permission mode — it can read and edit files but requires approval for shell commands

## Troubleshooting

**"Session expired" error**
Run `npx taskpilot-cli login` again to re-authenticate.

**"Trello not connected" or "API key not configured"**
The CLI uses your web app account's integrations. Go to the web dashboard, complete onboarding (connect Trello and save your API key), then try the CLI again.

**Can I use the CLI without the web server running?**
No — the CLI authenticates against and fetches data from the web app. You need either a local dev server or a deployed instance running.

**Claude asked me a question — what do I do?**
Sometimes the agent needs clarification. The question appears in yellow with a `>` prompt. Type your answer and press Enter — the agent will continue working.

## License

MIT
