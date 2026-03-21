**Phase 1 (Scaffold)** — Complete.

**Phase 2 (Database)** — Complete.

**Phase 3 (Authentication)** — Complete. Includes forgot password / reset password flow via Resend email.

**Phase 4 (Onboarding & Settings)** — Complete.

**Phase 5 (Trello Integration)** — Complete. Custom Trello token-based auth (not OAuth 2.0). Cards moved to "Done" list when all items complete. Done cards filtered from Claude sessions.

**Phase 6 (UI)** — Complete. Active/Done card separation. Done cards greyed out with checkmark. Interactive chat input for Claude sessions.

**Phase 7 (Claude Code Session)** — Complete. Bidirectional communication via `streamInput()`. MCP tools auto-allowed. `move_card_to_done` tool.

**Phase 8 (Polish)** — Complete.
- `ErrorFallback` component with "Try again" and "Go home" actions, wired as `defaultErrorComponent` on the router
- `NotFound` component (404 page) wired as `defaultNotFoundComponent` on the router and `notFoundComponent` on the root route
- `PageSkeleton` component wired as `pendingComponent` on all protected routes (dashboard, board, settings, onboarding)
- Removed unused `Footer` component
- Nitro configured for Vercel deployment

**Phase 9 (CLI Tool)** — Complete. Published as `claude-trello-cli` on npm.
- Standalone package: `npx claude-trello-cli` (no project install needed)
- Commands: `register`, `login`, `logout`, `setup`, `run`, `boards`, `status`
- `setup` wizard: opens browser for Trello OAuth, polls for completion, then prompts for API key
- `run`: interactive board selection, board overview, Claude Code session with descriptive tool output
- `--message` flag for initial instructions to Claude
- MCP tools (`check_trello_item`, `move_card_to_done`) run locally via Trello API
- Default server: `https://ct.joshualevine.me`
- Origin header fix for Better Auth CSRF
- `/api/cli/credentials` endpoint returns decrypted credentials for authenticated CLI users

**Phase 10 (Documentation)** — Complete.
- `/docs/cli` page on web app with full CLI reference, examples, troubleshooting, security notes
- npm README with quick start, all commands, flag reference, architecture diagram
- Landing page in separate repo (`claude-trello-frontend`): hero with terminal preview, how-it-works, features, CLI docs, CTA
- Dark/light/auto theme on landing page matching main app
- Terminal icon favicon and app icons on both sites

**Phase 11 (Parallel Agents)** — Not started. Plan written in CLAUDE.md.

Sub-phases:
- [ ] **11a: Types** — `ParallelSessionConfig`, `AgentStatus`, `ParallelEvent`, `ParallelSessionSummary` in `src/lib/types.ts` + `cli/src/lib/types.ts`
- [ ] **11b: Prompts** — `PARALLEL_AGENT_SYSTEM_PROMPT` and `buildParallelCardPrompt()` in `src/lib/prompts.ts`
- [ ] **11c: Git helpers** — New `src/lib/git.ts` with worktree create/remove/merge, diff stats, branch/sha utils
- [ ] **11d: Per-card agent** — `launchCardAgent()` in `src/lib/claude.ts` (scoped system prompt, single card, lower maxTurns)
- [ ] **11e: Orchestrator** — New `src/lib/parallel.ts` with `launchParallelSession()` → `AsyncGenerator<ParallelEvent>` (concurrency-limited, worktree management, merge sequence, summary generation)
- [ ] **11f: Web API** — Extend `session.ts` POST with `mode: 'parallel'` + `maxConcurrency`, multiplexed SSE streaming of `ParallelEvent`
- [ ] **11g: Web UI** — Mode toggle, concurrency slider on `$boardId.tsx`. New `ParallelSessionView.tsx` (agent status grid, tabbed logs, summary panel). New `AgentStatusRow.tsx`
- [ ] **11h: CLI parallel** — `--parallel` / `--concurrency` flags in `run.ts`. Multi-agent status display with progress bars. `runParallelSession()` in `cli/src/lib/runner.ts`
- [ ] **11i: Safety** — Per-agent cost budget ($2 default), cost estimate warning before launch, global subprocess cap (5 max), one orchestration per user

Zero TypeScript errors. Dev server starts cleanly.
