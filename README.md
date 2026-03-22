# TaskPilot

Point AI coding agents at your task boards. TaskPilot connects to Trello, GitHub, and GitLab, reads your cards and issues, and uses AI to work through them — checking off items as it goes.

## Features

- **Multi-source**: Trello boards, GitHub issues, GitLab issues
- **Multi-provider**: Claude (Anthropic), OpenAI (GPT-4o), Groq (Llama 3.3 70B)
- **Parallel agents**: One agent per card in isolated git worktrees with automatic merge
- **Smart dependencies**: Detects "Depends on #N" in card descriptions, topologically sorts tasks
- **PR automation**: Auto-creates pull requests after sessions complete
- **Cost tracking**: Per-session token/cost breakdowns, monthly budgets with alerts
- **Session history**: Full event log replay for every session
- **Real-time updates**: Webhook receivers for instant task source changes
- **CLI tool**: `npx taskpilot-cli` for terminal-based workflows
- **Self-hostable**: Bring your own API keys, database, and OAuth apps

## Quick Start

```bash
git clone https://github.com/JoshJAL/claude-trello.git
cd claude-trello
pnpm install
cp .env.example .env
# Fill in .env values (see Self-Hosting Guide below)
pnpm db:push
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Self-Hosting Guide

TaskPilot is designed to be self-hosted. There is no shared server-side API key — every user supplies their own AI provider keys. You need:

### Prerequisites

- **Node.js 20+**
- **pnpm** (package manager)
- A **Turso** database (free tier works fine)
- At least one task source: **Trello**, **GitHub**, or **GitLab** OAuth app
- A domain with HTTPS for webhooks and OAuth callbacks (or localhost for development)

### 1. Database Setup (Turso)

Create a free database at [turso.tech](https://turso.tech):

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create a database
turso db create taskpilot

# Get your credentials
turso db show taskpilot --url          # -> TURSO_DATABASE_URL
turso db tokens create taskpilot       # -> TURSO_AUTH_TOKEN
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

| Variable | Required | How to Get It |
|----------|----------|---------------|
| `BETTER_AUTH_SECRET` | Yes | Run `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Yes | Your app URL (e.g. `http://localhost:3000`) |
| `TURSO_DATABASE_URL` | Yes | From `turso db show <name> --url` |
| `TURSO_AUTH_TOKEN` | Yes | From `turso db tokens create <name>` |
| `ENCRYPTION_KEY` | Yes | Run `openssl rand -hex 32` (encrypts user API keys) |
| `BASE_URL` | Yes | Same as `BETTER_AUTH_URL` |
| `VITE_BETTER_AUTH_URL` | Yes | Same as `BETTER_AUTH_URL` |
| `TRELLO_API_KEY` | For Trello | From [trello.com/app-key](https://trello.com/app-key) |
| `TRELLO_API_SECRET` | For Trello | Same page as above |
| `GITHUB_CLIENT_ID` | For GitHub | From [github.com/settings/developers](https://github.com/settings/developers) (OAuth Apps) |
| `GITHUB_CLIENT_SECRET` | For GitHub | Same page as above |
| `GITLAB_CLIENT_ID` | For GitLab | From [gitlab.com/-/user_settings/applications](https://gitlab.com/-/user_settings/applications) |
| `GITLAB_CLIENT_SECRET` | For GitLab | Same page as above |
| `RESEND_API_KEY` | For password reset emails | From [resend.com/api-keys](https://resend.com/api-keys) |
| `GITHUB_WEBHOOK_SECRET` | Optional | Any random string, for webhook signature validation |
| `GITLAB_WEBHOOK_SECRET` | Optional | Any random string, for webhook token validation |

You only need the OAuth credentials for the task sources you plan to use. At minimum, configure one of Trello, GitHub, or GitLab.

### 3. OAuth Callback URLs

When creating your OAuth apps, set these callback URLs:

| Source | Callback URL |
|--------|-------------|
| Trello | `{BASE_URL}/api/auth/callback/trello` |
| GitHub | `{BASE_URL}/api/github/callback` |
| GitLab | `{BASE_URL}/api/gitlab/callback` |

Replace `{BASE_URL}` with your actual URL (e.g. `https://taskpilot.yourdomain.com`).

### 4. Push the Database Schema

```bash
pnpm db:push
```

This creates all required tables in your Turso database.

### 5. Run in Development

```bash
pnpm dev
```

### 6. Build for Production

```bash
pnpm build
pnpm preview   # or deploy the .output/ directory
```

TaskPilot uses Nitro under the hood, so it can deploy to:
- **Vercel** (configured out of the box)
- **Node.js** (run `.output/server/index.mjs`)
- **Docker** (build and run the Node server)
- Any platform that supports Nitro presets

### 7. Webhooks (Optional)

For real-time task updates (instead of polling), set up webhooks:

- **Trello**: Webhooks are auto-registered when you start your first session on a board
- **GitHub**: In your repo settings, add a webhook pointing to `{BASE_URL}/api/webhooks/github` with content type `application/json`. Set the secret to match `GITHUB_WEBHOOK_SECRET`
- **GitLab**: In your project settings, add a webhook pointing to `{BASE_URL}/api/webhooks/gitlab`. Set the token to match `GITLAB_WEBHOOK_SECRET`

## CLI Tool

The CLI runs on your local machine and connects to your TaskPilot instance:

```bash
npx taskpilot-cli login
npx taskpilot-cli run
```

By default it connects to `https://ct.joshualevine.me`. To point it at your own instance:

```bash
TASKPILOT_URL=https://taskpilot.yourdomain.com npx taskpilot-cli login
```

See the [CLI docs](https://github.com/JoshJAL/claude-trello/tree/main/cli) or run `taskpilot --help`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (full-stack React) |
| Routing | TanStack Router (file-based, type-safe) |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS v4 |
| Auth | Better Auth (email/password + OAuth linking) |
| Database | Turso (libSQL) via Drizzle ORM |
| AI | Anthropic SDK, Claude Code SDK, OpenAI SDK, Groq SDK |
| Encryption | AES-256-GCM (Node.js crypto) |

## Development

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server on port 3000
pnpm test             # Run tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # With coverage report
pnpm db:push          # Push schema to database
pnpm db:generate      # Generate migration files
pnpm db:studio        # Open Drizzle Studio
pnpm build            # Production build
```

## Architecture

Users bring their own API keys for AI providers (Claude, OpenAI, Groq). Keys are encrypted with AES-256-GCM before storage and only decrypted at the moment a session launches. There is no shared server-side AI key.

Task sources (Trello, GitHub, GitLab) connect via OAuth. Tokens are stored per-user in the database.

Sessions stream results via Server-Sent Events and record full event logs for replay. The parallel agent orchestrator uses git worktrees for isolation and merges results with conflict detection.

See [CLAUDE.md](./CLAUDE.md) for the full architecture reference.

## License

MIT

## Links

- **Source**: [github.com/JoshJAL/claude-trello](https://github.com/JoshJAL/claude-trello)
- **CLI on npm**: [taskpilot-cli](https://www.npmjs.com/package/taskpilot-cli)
