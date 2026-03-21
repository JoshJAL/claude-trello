# claude-trello-cli

Point [Claude Code](https://docs.anthropic.com/en/docs/claude-code) at a Trello board and work through tasks from your terminal. Claude reads your cards and checklists, makes the code changes, and checks items off on Trello as it goes.

## Quick Start

```bash
npx claude-trello-cli login
cd ~/my-project
npx claude-trello-cli run
```

That's it. No config files, no setup scripts — just sign in and go.

## What It Does

1. You sign in with your [Claude Trello Bridge](https://github.com/JoshJAL/claude-trello) account
2. You pick a Trello board from your connected boards
3. The CLI shows you all active cards and their checklist items
4. Claude Code launches locally in your working directory
5. As Claude completes each task, the checklist item gets checked off on Trello
6. When all items on a card are done, the card moves to your Done list

```
$ npx claude-trello-cli run

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
npx claude-trello-cli login
```

**Or install globally** for a shorter command:

```bash
npm install -g claude-trello-cli

claude-trello login
claude-trello run
```

## Prerequisites

- **A Claude Trello Bridge account** — sign up at [ct.joshualevine.me](https://ct.joshualevine.me), connect your Trello account, and save your Anthropic API key
- **Node.js 20+**

## Commands

### `claude-trello-cli login`

Sign in with your email and password. Your session is stored at `~/.config/claude-trello/config.json` with restricted file permissions.

```bash
npx claude-trello-cli login
npx claude-trello-cli login --server https://your-app.vercel.app
```

| Flag | Description |
|------|-------------|
| `-s, --server <url>` | Server URL (default: `https://ct.joshualevine.me`) |

### `claude-trello-cli run`

The main command. Select a board interactively, review the cards, and launch a Claude Code session.

```bash
npx claude-trello-cli run
npx claude-trello-cli run --board 60d5e2a3f1a2b40017c3d4e5
npx claude-trello-cli run --dir ~/projects/my-api
npx claude-trello-cli run --message "Check the development branch for comparison"
```

Without `--message`, you'll be prompted interactively before the session starts. Press Enter to skip.

| Flag | Description |
|------|-------------|
| `-b, --board <id>` | Board ID — skip interactive selection |
| `-d, --dir <path>` | Working directory (default: current directory) |
| `-m, --message <text>` | Initial instructions for Claude (e.g. "focus on API cards first") |

### `claude-trello-cli boards`

List all your Trello boards with their IDs. Useful for grabbing a board ID to pass to `run --board`.

```bash
npx claude-trello-cli boards

# Your Trello Boards (3):
#
#   My Project Board  60d5e2a3f1a2b40017c3d4e5
#   Side Project      507f1f77bcf86cd799439011
#   Personal Tasks    612a3b4c5d6e7f8a9b0c1d2e
```

### `claude-trello-cli status`

Check your auth and integration status.

```bash
npx claude-trello-cli status

# Claude Trello Bridge — Status
#
#   Server:  https://ct.joshualevine.me
#   Auth:    Signed in as Your Name
#   Trello:  Connected
#   API Key: Configured
#
#   Ready to go! Run `claude-trello run` to start.
```

### `claude-trello-cli logout`

Clear your stored session.

```bash
npx claude-trello-cli logout
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
     │  4. Launch Claude Code locally                           │
     │  ┌─────────────────────┐                                 │
     │  │ Claude reads/edits  │                                 │
     │  │ your codebase       │                                 │
     │  │                     │  5. check_trello_item           │
     │  │ Task complete ──────│────────────────────────────────>│
     │  │                     │  6. move_card_to_done           │
     │  │ Card complete ──────│────────────────────────────────>│
     │  └─────────────────────┘                                 │
```

1. **Authenticate** — Signs in to the web app, stores a session cookie locally
2. **Fetch board data** — Gets your boards, cards, and checklists via the web app's API
3. **Load credentials** — Your encrypted Anthropic API key is decrypted server-side and sent once for the session
4. **Run Claude Code locally** — Launches in your working directory with full codebase access
5. **Update Trello** — As Claude finishes each checklist item, it calls the Trello API directly to check it off
6. **Move cards** — When all items on a card are done, the card moves to your Done list

## Security

- Your **Anthropic API key is encrypted at rest** (AES-256-GCM) in the web app's database and only decrypted for the duration of a session
- The local config file is written with **restricted permissions** (`600` — owner-only read/write)
- API credentials are **held in memory only** during a session — never written to disk by the CLI
- Claude Code runs with `acceptEdits` permission mode — it can read and edit files but requires approval for shell commands

## Troubleshooting

**"Session expired" error**
Run `npx claude-trello-cli login` again to re-authenticate.

**"Trello not connected" or "API key not configured"**
The CLI uses your web app account's integrations. Go to the web dashboard, complete onboarding (connect Trello and save your Anthropic API key), then try the CLI again.

**Can I use the CLI without the web server running?**
No — the CLI authenticates against and fetches data from the web app. You need either a local dev server or a deployed instance running.

**Claude asked me a question — what do I do?**
Sometimes Claude needs clarification. The question appears in yellow with a `>` prompt. Type your answer and press Enter — Claude will continue working.

## License

MIT
