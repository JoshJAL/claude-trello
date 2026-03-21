**Phase 1 (Scaffold)** — Complete. TanStack Start project with Tailwind v4, `.env.example`, directory structure, theme toggle.

**Phase 2 (Database)** — Complete. Drizzle schema (5 tables: user, session, account, verification, user_settings), Drizzle client via `@libsql/client` for Turso, `drizzle.config.ts` with `dialect: "turso"`, schema pushed to Turso.

**Phase 3 (Authentication)** — Complete. Better Auth server config (`src/lib/auth.ts`) with `emailAndPassword` top-level option, `genericOAuth` plugin for Trello, `drizzleAdapter` for Turso/SQLite, and `tanstackStartCookies()` plugin. React auth client (`src/lib/auth-client.ts`) via `better-auth/react` with `genericOAuthClient` plugin. Auth catch-all API route at `src/routes/api/auth/$.ts` using `server.handlers`. Session helpers in `src/lib/auth.functions.ts`. `AuthForm.tsx`, auth-aware `Header.tsx`, sign-in/register routes, all protected routes.

**Phase 4 (Onboarding & Settings)** — Complete. `src/lib/encrypt.ts` with AES-256-GCM. API routes for integration status and API key management. `useIntegrationStatus` hook. `ConnectTrello.tsx`, `ApiKeyForm.tsx`, `OnboardingSteps.tsx`. Onboarding wizard (2-step) and settings page.

**Phase 5 (Trello Integration)** — Complete. `src/lib/trello.ts` API client with `getBoards`, `getCards`, `updateCheckItem`. API routes: `GET /api/trello/boards`, `GET /api/trello/cards?boardId=`, `PATCH /api/trello/checklist`. All routes authenticate via Better Auth session and read Trello token from accounts table.

**Phase 6 (UI)** — Complete. `BoardPanel.tsx` renders cards with loading skeletons and error states. `CardItem.tsx` shows card name, description, checklist progress counter, and checklists. `ChecklistItem.tsx` with checkbox toggle. `useBoardData` hook with `useBoards`, `useCards` (polling support), and `useCheckItem` mutation with optimistic updates. Dashboard index shows board selector grid; `$boardId` route shows board panel with session controls.

**Phase 7 (Claude Code Session)** — Complete. `src/lib/prompts.ts` with system prompt and board-to-prompt serializer. `src/lib/claude.ts` session launcher using `@anthropic-ai/claude-agent-sdk` — creates `check_trello_item` MCP tool via `tool()` + `createSdkMcpServer()`, passes user's decrypted API key via env, uses `permissionMode: "acceptEdits"`. SSE streaming route at `POST /api/claude/session` with per-user rate limit (one active session) and `DELETE` for abort. `useClaudeSession` hook parses SSE stream into typed log entries. `SessionLog.tsx` renders live output with auto-scroll and running indicator. `$boardId` route integrates start/stop controls, session log, and polling-on-active board panel.

**Phase 8 (Polish)** — Not yet started. Remaining: error boundaries, loading skeletons (partially done in BoardPanel), session history, webhook support.

Zero TypeScript errors. Dev server starts cleanly.
