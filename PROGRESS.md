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
