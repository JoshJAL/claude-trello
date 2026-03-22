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

**Phase 9 (CLI Tool)** — Complete. Published as `taskpilot-cli` on npm.
- Standalone package: `npx taskpilot-cli` (no project install needed)
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
- Landing page in separate repo (`taskpilot-frontend`): hero with terminal preview, how-it-works, features, CLI docs, CTA
- Dark/light/auto theme on landing page matching main app
- Terminal icon favicon and app icons on both sites

**Phase 11 (Parallel Agents)** — Complete.

Sub-phases:
- [x] **11a: Types** — `ParallelSessionConfig`, `AgentStatus`, `ParallelEvent`, `ParallelSessionSummary` in `src/lib/types.ts` + `cli/src/lib/types.ts`
- [x] **11b: Prompts** — `PARALLEL_AGENT_SYSTEM_PROMPT` and `buildParallelCardPrompt()` in `src/lib/prompts.ts`
- [x] **11c: Git helpers** — New `src/lib/git.ts` with worktree create/remove/merge, diff stats, branch/sha utils
- [x] **11d: Per-card agent** — `launchCardAgent()` in `src/lib/claude.ts` (scoped system prompt, single card, maxTurns=30)
- [x] **11e: Orchestrator** — New `src/lib/parallel.ts` with `launchParallelSession()` → `AsyncGenerator<ParallelEvent>` (concurrency-limited worker pool, worktree management, merge sequence, summary generation)
- [x] **11f: Web API** — Extended `session.ts` POST with `mode: 'parallel'` + `maxConcurrency`, multiplexed SSE streaming of `ParallelEvent`
- [x] **11g: Web UI** — Mode toggle (Sequential/Parallel), concurrency slider on `$boardId.tsx`. New `ParallelSessionView.tsx` (agent status grid with progress bars, tabbed log panels, summary panel with diff stats and merge conflicts). New `AgentStatusRow.tsx`
- [x] **11h: CLI parallel** — `--parallel` / `-p` and `--concurrency <n>` / `-c <n>` flags in `run.ts`. Multi-agent status display with card-tagged output. `runParallelSession()` in `cli/src/lib/runner.ts` with full orchestration (worktrees, concurrent agents, merge, summary)
- [x] **11i: Safety** — Per-agent cost budget ($2 default via `MAX_COST_PER_AGENT_USD`), global subprocess cap (5 max), one orchestration per user (activeSessions map), concurrency clamped 1-5

**Phase 12 (Multi-AI Provider Support)** — Complete.

Sub-phases:
- [x] **12a: Types & provider abstraction** — `AiProviderId`, `ProviderAdapter`, `ProviderSession`, `AgentMessage` in `src/lib/providers/types.ts`. Factory in `src/lib/providers/index.ts`. `AI_PROVIDERS` config map with label, key prefix, validation regex, and console URL per provider. Stub adapter classes for claude/openai/groq. `IntegrationStatus` updated with `configuredProviders` array in both web and CLI types.
- [x] **12b: Database** — new `provider_keys` table with `(userId, providerId)` unique index, `encryptedApiKey` column. Old `userSettings.encryptedAnthropicApiKey` kept but deprecated for migration.
- [x] **12c: API routes** — POST/DELETE `/api/settings/apikey` accepts `providerId`, validates per-provider key pattern. GET `/api/settings/status` returns `configuredProviders[]` from `provider_keys` with legacy fallback. Session route accepts `providerId`, looks up key from `provider_keys`. CLI credentials endpoint accepts `?providerId=` query param. All routes maintain backward compat with legacy `userSettings` for Claude.
- [x] **12d: Claude provider adapter** — `ClaudeAdapter` class wraps existing `launchClaudeSession()` and `launchCardAgent()` via `wrapClaudeQuery()` helper. Raw SDK messages passed through in `AgentMessage.raw` for backward compat with existing SSE hooks.
- [x] **12e: Generic agent loop + OpenAI/Groq** — `generic-agent.ts` with `createGenericAgentSession()` agent loop (chat completion → tool calls → execute → loop). `tools.ts` with 6 coding tools (read_file, write_file, edit_file, bash, search_files, list_files) + Trello tools, path traversal prevention, output truncation. `openai.ts` OpenAI adapter (gpt-4o). `groq.ts` Groq adapter (llama-3.3-70b-versatile). `prompts.ts` with `GENERIC_AGENT_SYSTEM_PROMPT`. New deps: `openai`, `groq-sdk`.
- [x] **12f: Parallel orchestrator** — `ParallelSessionParams` accepts optional `providerId`. Non-Claude providers dispatch through `getProvider()` factory. Claude continues using direct SDK for best performance.
- [x] **12g: UI** — `ApiKeyForm` generalized with `providerId` prop (label, placeholder, validation, console link per provider). Settings page renders all 3 providers. Onboarding step 2 shows all providers ("Configure an AI Provider"). Board page has provider dropdown (only shown when 2+ providers configured). `useIntegrationStatus` exposes `configuredProviders[]`.
- [x] **12h: CLI** — `--provider` / `-P` flag on `run` command. CLI providers directory with `generic-agent.ts`, `tools.ts`, `openai.ts`, `groq.ts`. `runGenericProviderMode()` handles non-Claude sessions with tool output formatting. New CLI deps: `openai`, `groq-sdk`.
- [x] **12i: Prompts** — `GENERIC_AGENT_SYSTEM_PROMPT` in `src/lib/providers/prompts.ts` describes available coding tools and Trello workflow instructions for non-Claude providers. Claude keeps its own system prompt via the SDK.

**Rebrand to TaskPilot** — Complete. All "Claude Trello" / "claude-trello" references replaced with "TaskPilot" / "taskpilot" across web app, CLI, docs, and README. CLI config dir migrated from `~/.config/claude-trello/` to `~/.config/taskpilot/` with backward-compat migration. CLI bin names: `taskpilot-cli`, `taskpilot`. Env var: `TASKPILOT_URL` (with `CLAUDE_TRELLO_URL` fallback).

**Persistent Sidebar Navigation** — Complete. `Sidebar.tsx` replaces `Header.tsx`. Collapsible sidebar (60px collapsed, 240px expanded) with localStorage persistence. Desktop: always visible. Mobile: overlay with hamburger in thin top bar. Sections: Sources (Trello, GitHub, GitLab), Settings, CLI Docs, user/theme/sign-out at bottom. Active route highlighting via `useMatchRoute`.

**Unified Task Source Abstraction** — Complete. `src/lib/tasks/types.ts` with `TaskSource`, `TaskBoard`, `TaskCard`, `TaskChecklist`, `TaskCheckItem`, `TaskBoardData`. Trello adapters in `adapters.ts`. Shared markdown task list parser in `parser.ts` (reused by GitHub and GitLab).

**Phase 13 (GitHub Integration)** — Complete.

Sub-phases:
- [x] **13a: GitHub types** — `GitHubRepo`, `GitHubIssue` in `src/lib/github/types.ts`. Unified `TaskSource`, `TaskBoard`, `TaskCard`, `TaskBoardData` in `src/lib/tasks/types.ts`. Trello adapters in `src/lib/tasks/adapters.ts`. Shared markdown task parser in `src/lib/tasks/parser.ts`.
- [x] **13b: GitHub OAuth** — `authorize.ts` (generates GitHub OAuth URL), `callback.tsx` (handles redirect, exchanges code), `connect.ts` (POST stores token in `account` table with `providerId: 'github'`, DELETE disconnects). `githubLinked` added to status endpoint and `useIntegrationStatus` hook.
- [x] **13c: GitHub API client** — `src/lib/github/client.ts` with `getRepos`, `getIssues`, `getIssue`, `updateIssueBody`, `closeIssue`, `addComment`, `createPullRequest`, `exchangeCodeForToken`, `verifyToken`. Parser re-exports from shared `src/lib/tasks/parser.ts`.
- [x] **13d: GitHub API routes** — `repos.ts` (GET repos), `issues.ts` (GET issues with parsed tasks), `task.ts` (PATCH toggle task item in issue body).
- [x] **13e: GitHub MCP tools** — `src/lib/github/tools.ts` with `check_github_task`, `close_github_issue`, `comment_on_issue`, `create_pull_request` registered as MCP server `"github-tools"`.
- [x] **13f: GitHub-aware prompts** — `GITHUB_SYSTEM_PROMPT`, `GITHUB_PARALLEL_SYSTEM_PROMPT`, `buildGitHubUserPrompt()`, `buildGitHubIssuePrompt()` in `src/lib/prompts.ts`.
- [x] **13g: Dashboard UI** — `ConnectGitHub.tsx` component. GitHub repo selector at `/dashboard/github/`. Repo session view at `/dashboard/github/$owner/$repo` with issue list and task progress. Settings page updated with GitHub connect/disconnect. Sidebar includes GitHub link under Sources.
- [x] **13h: Onboarding** — Step 1 renamed to "Task Source" (was "Connect Trello"). Onboarding page shows both Trello and GitHub connection options. Continue button enabled when at least one source connected.
- [x] **13i: CLI GitHub support** — `repos` command registered in CLI index. `cli/src/lib/github.ts` with `getRepos`, `getIssues`, `parseTaskList`, `toggleTaskItem`, `updateIssueBody`, `closeIssue`. Repos command fetches from server API.
- [x] **13j: Session route** — Accepts `source: 'trello' | 'github'` and `githubOwner`/`githubRepo` params. Validates and looks up the correct token from `account` table based on source. `sourceToken` extracted and stored in session metadata for future wiring into provider adapters.

**Phase 14 (GitLab Integration)** — Complete.

Sub-phases:
- [x] **14a: GitLab types** — `GitLabProject`, `GitLabIssue` in `src/lib/gitlab/types.ts`
- [x] **14b: GitLab OAuth** — `authorize.ts` (generates GitLab OAuth URL), `callback.tsx` (handles redirect, exchanges code), `connect.ts` (POST stores token in `account` table with `providerId: 'gitlab'`, DELETE disconnects)
- [x] **14c: GitLab API client** — `src/lib/gitlab/client.ts` with `getProjects`, `getIssues`, `getIssue`, `updateIssueDescription`, `closeIssue`, `addNote`, `createMergeRequest`, `exchangeCodeForToken`, `verifyToken`. Parser re-exports from shared `src/lib/tasks/parser.ts`
- [x] **14d: GitLab API routes** — `projects.ts` (GET projects), `issues.ts` (GET issues with parsed tasks), `task.ts` (PATCH toggle task item in issue description)
- [x] **14e: GitLab MCP tools** — `src/lib/gitlab/tools.ts` with `check_gitlab_task`, `close_gitlab_issue`, `comment_on_issue`, `create_merge_request` registered as MCP server `"gitlab-tools"`
- [x] **14f: GitLab-aware prompts** — `GITLAB_SYSTEM_PROMPT`, `GITLAB_PARALLEL_SYSTEM_PROMPT`, `buildGitLabUserPrompt()`, `buildGitLabIssuePrompt()` in `src/lib/prompts.ts`
- [x] **14g: Dashboard UI** — `ConnectGitLab.tsx` component. GitLab project selector at `/dashboard/gitlab/`. Project session view at `/dashboard/gitlab/$projectId` with issue list and task progress
- [x] **14h: Wiring** — Status endpoint returns real `gitlabLinked` from DB. Settings and onboarding pages include GitLab connect/disconnect. Session route accepts `source: "gitlab"` with `gitlabProjectId` param
- [x] **14i: Env vars** — `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET` added to `.env.example`

**CLAUDE.md Consolidation** — Complete. Removed 113-line implementation checklist (→ PROGRESS.md). Condensed Phase 11/12/13 architecture sections to design-decisions summaries. Added Phase 14 GitLab details. Added GitHub/GitLab env vars to env section.

Zero TypeScript errors. Dev server starts cleanly.

**Updates & Changelog System** — Complete. Typed `AppUpdate` entries in `src/lib/updates.ts` with all shipped features. `lastSeenUpdateAt` column on `user_settings` for per-user tracking. `GET /api/updates` returns all updates + unseen count. `POST /api/updates/seen` marks as read. `UpdateBanner` component shows on Trello/GitHub/GitLab dashboard index pages when there are unseen updates (dismissible, marks seen on dismiss). `/updates` changelog page with "New" badges on unseen items, type badges (Feature/Improvement/Fix), auto-marks-seen on visit. Sidebar `Updates` link with lucide `Sparkles` icon and numbered badge dot when unseen > 0.

---

**Phase 15 (Session History & Persistence)** — Complete.

Persistent record of every agent session with full event log replay. New `agent_session` and `session_event` tables. Session list page with filters, detail page with log replay. CLI `history` command.

Sub-phases:
- [x] **15a: Schema & types** — `agentSessions` and `sessionEvents` tables in `src/lib/db/schema.ts`, Drizzle migration generated. `AgentSessionSummary`, `SessionEvent`, `SessionListQuery`, `SessionListResponse`, `SessionDetailResponse`, `SessionEventsResponse` types in `src/lib/types.ts`
- [x] **15b: Session write path** — `SessionWriter` class in `src/lib/session-history.ts` with buffered event writing (flush every 20 events or 500ms), `recordMessage()` for SSE events with automatic `task_completed` detection, `complete()`/`fail()`/`cancel()` status updates. Wired into all 3 streaming paths (web, parallel, sequential) in `src/routes/api/claude/session.ts`. `X-Session-Id` response header on all SSE streams. Client disconnect triggers `cancel()`
- [x] **15c: API routes** — `GET /api/sessions` (list, paginated, filterable by source/status, sortable), `GET /api/sessions/$sessionId` (detail), `GET /api/sessions/$sessionId/events` (paginated log ordered by sequence), `POST /api/sessions/$sessionId/retry` (returns config for re-launch), `DELETE /api/sessions/$sessionId` (cascade deletes events)
- [x] **15d: History list UI** — `/history` route with session rows showing source icon, board/repo name, provider/mode, status badge, tasks completed, cost, duration, date. Filter dropdowns for source, status, sort order. Pagination. Delete button per row. `History` link added to Sidebar navigation with lucide `History` icon
- [x] **15e: Session detail UI** — `/history/$sessionId` route with metadata header (source, provider, mode, tasks, duration, cost, tokens, timestamps), error display, initial message display. Scrollable event log with type-based coloring, agent index tags for parallel sessions, event summary extraction. Pagination for events. Delete action with redirect
- [x] **15f: CLI history command** — `historyCommand` in `cli/src/commands/history.ts`. `taskpilot history` (list recent 10), `--all` (list all), `--source`/`--status` filters, `<sessionId>` (detail view), `--events` (full event log stream). API functions `getSessions`, `getSessionDetail`, `getSessionEvents` added to `cli/src/lib/api.ts`

**Phase 16 (Cost Tracking & Analytics)** — Complete.

Per-provider cost calculation, token tracking across all providers, budget system with alerts, analytics dashboard, CLI usage command.

Sub-phases:
- [x] **16a: Cost calculation** — `src/lib/providers/cost.ts` with `PRICING` table (cents per million tokens for Claude, OpenAI, Groq), `calculateCost()`, `extractClaudeUsage()`, `extractGenericUsage()` helpers
- [x] **16b: Token tracking** — Extended `AgentMessage` with optional `usage` field. Updated `ChatCompletionFn` return type to include `usage`. OpenAI and Groq adapters now return `response.usage` from their completion callbacks. Generic agent loop accumulates tokens per turn and emits totals on the `done` message. `SessionWriter.recordMessage()` extracts usage from Claude raw result messages and OpenAI/Groq done messages. `complete()`/`fail()`/`cancel()` all write `inputTokens`, `outputTokens`, and `totalCostCents` to `agentSessions`
- [x] **16c: Budget schema & enforcement** — `monthlyBudgetCents` and `budgetAlertThreshold` columns on `user_settings` (migration `0002`). `checkBudget()` in `session-history.ts` sums current month spend, blocks if over limit (HTTP 429), emits system warning event if near threshold. `GET/PUT /api/settings/budget` endpoints for managing budget
- [x] **16d: Analytics API routes** — `GET /api/analytics/summary` (month totals + budget info), `GET /api/analytics/daily` (30-day GROUP BY date), `GET /api/analytics/providers` (GROUP BY providerId). All use efficient Drizzle `sql` aggregations
- [x] **16e: Analytics UI** — `/analytics` route with summary cards (spend, sessions, tasks, tokens), budget progress bar (green/amber/red), CSS-only daily spend bar chart, provider stacked bar + legend. `BarChart3` sidebar link
- [x] **16f: Settings budget section** — Budget section on Settings page: dollar input with save, range slider for alert threshold (10-100%), "Remove budget limit" button. Uses `useBudget()` and `useUpdateBudget()` hooks
- [x] **16g: CLI usage command** — `usageCommand` in `cli/src/commands/usage.ts`. Shows month label, total spend, sessions, tasks, avg cost, tokens, budget progress with color coding

**Phase 17 (Smart Task Ordering & Dependencies)** — Complete.

Dependency detection, topological sort, dependency-aware parallel execution.

Sub-phases:
- [x] **17a: Dependency parser** — `src/lib/tasks/dependencies.ts` with regex-based parsers for Trello (description), GitHub (`Depends on #N`, labels), GitLab (description, labels). `parseDependencies()` and utility functions
- [x] **17b: Graph builder** — `buildDependencyGraph()` with Kahn's algorithm topological sort, cycle detection, `DependencyGraph` type. `reorderByDependencies()` and `formatDependencyContext()` helpers
- [x] **17c: Sequential integration** — Session route reorders `boardData.cards` by execution order, injects dependency context into user message. `skipDependencies` body param supported
- [x] **17d: Parallel integration** — Orchestrator updated with `waiting`/`ready`/`running`/`blocked` task states. Workers only pick ready tasks. Completed tasks resolve downstream. Failed tasks block dependents. New `agent_waiting`, `dependency_resolved`, `dependency_blocked` event types
- [x] **17e: Prompt updates** — `buildDependencyPromptSection()` in `src/lib/prompts.ts` generates dependency context for agent prompts
- [x] **17f: UI dependency indicators** — `CardItem` shows "Blocked by: ..." chip. `BoardPanel` computes dependency graph. `AgentStatusRow` shows waiting/blocked states. GitHub/GitLab dashboard routes compute deps from issue bodies/labels
- [x] **17g: CLI dependency output** — `--no-deps` flag on `run` command. Dependency display before session start. Handles `agent_waiting`, `dependency_resolved`, `dependency_blocked` parallel events. CLI-side parser in `cli/src/lib/dependencies.ts`

**Phase 18 (PR/MR Automation)** — Complete.

Opt-in automatic PR/MR creation after session completion.

Sub-phases:
- [x] **18a: Automation config** — `PrAutomationConfig` type with `enabled`, `autoDraft`, `autoLinkIssue`, `branchNamingPattern`. Stored as JSON in `user_settings.prAutomationConfig` column (migration `0003`). `GET/PUT /api/settings/automation` routes
- [x] **18b: PR generation logic** — `src/lib/pr.ts` with `createPr()` wrapping GitHub/GitLab clients, `generateBranchName()`, `countTasks()`, `extractIssueNumbers()`, `attachPrToTrelloCard()`, `parsePrAutomationConfig()`
- [x] **18c: PR body template** — `generatePrBody()` with source info, task completion stats, provider/mode/duration, "Closes #N" auto-linking, TaskPilot attribution
- [x] **18d: Session integration** — `attemptPrCreation()` in session route, called in all 3 streaming paths (web, parallel, sequential). Emits `pr_created` SSE event before "done". Best-effort — errors logged, never fail session
- [x] **18e: Trello PR attachment** — When source is Trello with linked GitHub/GitLab, PR URL attached to card via Trello API + comment posted
- [x] **18f: Settings UI** — `PrAutomationSettings` component on Settings page: enable toggle, draft checkbox, auto-link checkbox, branch naming pattern with live preview
- [x] **18g: Session UI integration** — `PrResultBanner` component on all 3 dashboard session views. `useClaudeSession` handles `pr_created` events. `SessionLog` has "pr" type styling
- [x] **18h: CLI PR flags** — `--pr` and `--no-pr` flags on `run` command. `cli/src/lib/pr.ts` with `attemptCliPrCreation()`

**Phase 19 (Testing & CI)** — Complete.

Unit test suite with Vitest and GitHub Actions CI pipeline.

Sub-phases:
- [x] **19a: Test infrastructure** — Vitest already installed as devDep alongside `@testing-library/react`, `jsdom`. Created `vitest.config.ts` with `vite-tsconfig-paths`, V8 coverage provider, `tests/` include pattern. Added `test:watch` and `test:coverage` scripts to `package.json`
- [x] **19b: Unit tests** — 58 tests across 5 test files:
  - `encrypt.test.ts` — round-trip, unique IV, format validation, malformed input, empty/unicode strings
  - `cost.test.ts` — all 3 providers, zero tokens, fractional cent rounding, Claude/generic usage extraction with edge cases
  - `parser.test.ts` — checked/unchecked/mixed items, indented, non-task lines, null body, toggle by index, out-of-range
  - `updates.test.ts` — array ordering, unique IDs, required fields, unseen filtering, latest date
  - `pr.test.ts` — countTasks, extractIssueNumbers, generateBranchName (slugify, truncation), generatePrBody (source info, Closes refs), parsePrAutomationConfig
- [ ] **19c: Integration tests** — Deferred. TanStack Start server routes require significant mocking infrastructure for API-level tests
- [ ] **19d: Component tests** — Deferred. Can be added incrementally as components change
- [ ] **19e: E2E tests** — Deferred. Playwright E2E requires full app running with test database
- [x] **19f: CI pipeline** — `.github/workflows/ci.yml` with 3 jobs: `lint-and-type` (tsc --noEmit), `test` (vitest run), `build` (pnpm build with env secrets). Runs on push to main and PRs. Uses pnpm 9, Node 20, actions/cache
- [ ] **19g: Coverage & badges** — Coverage configured in vitest.config.ts (V8 provider, lcov reporter). Codecov/badge integration deferred

**Phase 20 (Webhooks & Real-Time Updates)** — Complete.

Webhook endpoints for all 3 sources with signature validation, SSE-based real-time event stream, auto-reconnecting client hook, webhook auto-registration, connection status indicator.

Sub-phases:
- [x] **20a: Webhook endpoints** — `POST /api/webhooks/trello` (HEAD handshake + HMAC-SHA1 via `TRELLO_API_SECRET`), `POST /api/webhooks/github` (`X-Hub-Signature-256` via `GITHUB_WEBHOOK_SECRET`, timing-safe compare), `POST /api/webhooks/gitlab` (`X-Gitlab-Token` via `GITLAB_WEBHOOK_SECRET`). All process asynchronously via `void processWebhook()`
- [x] **20b: Webhook processor** — `src/lib/webhooks/processor.ts`: normalizes Trello (card/checklist updates), GitHub (issues, PRs), GitLab (issues, MRs) into `NormalizedEvent` types (`task_updated`, `card_moved`, `issue_closed`, `pr_merged`, `generic`). Finds affected users via `account` table, broadcasts to their WebSocket channels
- [x] **20c: WebSocket server** — SSE-based via `GET /api/ws` (uses existing TanStack Start route pattern, no extra dependencies). Better Auth session authentication. `ws-manager.ts` with `addClient`/`removeClient`/`broadcast` functions. 30s keep-alive pings. Clean up on client disconnect
- [x] **20d: Client WebSocket hook** — `useWebSocket()` hook with `EventSource`, auto-reconnect with exponential backoff (1s→30s max). Invalidates TanStack Query caches on webhook events (routes to correct query key by source: `trello/cards`, `github/issues`, `gitlab/issues`). `RealtimeProvider` context wraps the app, only connects when authenticated
- [x] **20e: Webhook registration** — `registered_webhooks` table (migration `0004`) with userId, source, sourceIdentifier, webhookId, secret, active flag. `ensureWebhookRegistered()` auto-registers Trello webhooks on first session (GitHub/GitLab log for manual setup). `deactivateWebhooks()` for source disconnect. Called non-blocking from session route
- [x] **20f: Polling fallback** — Polling hooks (`useBoardData`, `useGitHubIssues`, `useGitLabIssues`) unchanged — they still poll at 5s when `polling=true`. WebSocket connection triggers `invalidateQueries` which supplements polling. When WS disconnects, polling continues as normal
- [x] **20g: UI indicators** — Connection status dot on user avatar in sidebar: green (connected/live), amber pulsing (connecting), gray (polling mode). Tooltip shows status. `useRealtime()` hook exposes `status` and `isConnected` throughout the app
