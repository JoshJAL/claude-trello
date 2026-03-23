# CLAUDE.md — Trello × Claude Code Bridge

> This file gives Claude Code full context about this project. Read it entirely before making any changes.

---

## Related Projects

| Project | Location | Description |
|---------|----------|-------------|
| **Backend + Web App** (this repo) | `/home/joshjal/Projects/personal/claude-trello` | TanStack Start full-stack app, API routes, AI session logic |
| **Frontend (landing/marketing)** | `/home/joshjal/Projects/personal/claude-trello-frontend` | Separate frontend project |
| **CLI** | `/home/joshjal/Projects/personal/claude-trello/cli` | npm package `@joshjal/taskpilot` — published to npm |

---

## Project Overview

This is a **full-stack web application** that bridges **Trello** and **Claude Code**. It lets you point Claude Code at a Trello board and a local codebase simultaneously. Claude Code reads the board's cards and checklists, works through the codebase to complete the tasks described, and checks off items in Trello as it finishes them.

### Authentication Architecture

Each user owns three credentials in this app — they are stored and managed independently:

| Credential            | Method           | Purpose                                | Stored in                                 |
| --------------------- | ---------------- | -------------------------------------- | ----------------------------------------- |
| **App login**         | Email + password | Authenticates the user into this app   | Better Auth (bcrypt hashed)               |
| **Trello connection** | Trello OAuth     | Grants API access to the user's boards | Better Auth linked accounts (DB)          |
| **Anthropic API key** | User-entered     | Powers Claude Code sessions            | `user_settings` table (AES-256 encrypted) |

There is **no shared server-side Anthropic API key**. Every user supplies their own key from [console.anthropic.com](https://console.anthropic.com). It is encrypted before being stored and decrypted only at the moment a Claude session is started — it is never sent to the client.

### Core User Flow

1. User registers or signs in with **email and password**
2. **Onboarding step 1** — Connect Trello: Better Auth runs Trello OAuth → token stored in linked accounts table
3. **Onboarding step 2** — Enter Anthropic API key: user pastes their key → encrypted and saved to `user_settings`
4. Returning users with both integrations configured land directly on the dashboard
5. User selects a Trello board and optionally a specific list or card
6. The app fetches the board's cards and checklist items and renders them in a live panel
7. Claude Code is given the board context as a structured prompt, launched using the user's own API key
8. As Claude Code completes tasks, it calls back to the app to check off matching Trello checklist items
9. The UI reflects Trello updates in real time via polling or webhooks
10. Users can revisit **Settings** at any time to reconnect Trello or update their Anthropic API key

---

## Tech Stack

| Layer                   | Technology                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework               | **TanStack Start** (full-stack React, SSR/SSG capable)                                                                                           |
| Routing                 | **TanStack Router** (file-based, type-safe)                                                                                                      |
| Data fetching / caching | **TanStack Query** (server + client)                                                                                                             |
| Tables (if needed)      | **TanStack Table**                                                                                                                               |
| Styling                 | **Tailwind CSS v4**                                                                                                                              |
| Language                | **TypeScript** (strict mode)                                                                                                                     |
| Runtime                 | **Node.js 20+**                                                                                                                                  |
| Package manager         | **pnpm**                                                                                                                                         |
| Authentication          | **Better Auth** (`better-auth`) — email/password login + Trello account linking                                                                  |
| Database                | **Turso** (libSQL) via **Drizzle ORM** (`drizzle-orm` + `@libsql/client`) — cloud SQLite, stores users, sessions, linked accounts, user settings |
| Trello connection       | **Better Auth generic OAuth** — Trello linked account, token stored per-user in DB                                                               |
| Trello API              | **Trello REST API v1** — called server-side using the user's stored Trello token                                                                 |
| API key encryption      | **Node.js `crypto`** (built-in) — AES-256-GCM — encrypts Anthropic API keys at rest                                                              |
| Claude integration      | **Anthropic SDK** (`@anthropic-ai/sdk`) + **Claude Code SDK** (`@anthropic-ai/claude-code`)                                                      |
| Environment config      | **dotenv** / TanStack Start built-in env handling                                                                                                |
| Linting / formatting    | **ESLint** + **Prettier**                                                                                                                        |

---

## Repository Structure

```
.
├── CLAUDE.md                        ← You are here
├── app/
│   ├── routes/
│   │   ├── __root.tsx               ← Root layout, global providers
│   │   ├── index.tsx                ← Landing page — sign-in form or redirect to dashboard
│   │   ├── register.tsx             ← New user registration form
│   │   ├── onboarding/
│   │   │   ├── index.tsx            ← Onboarding shell — step tracker
│   │   │   ├── trello.tsx           ← Step 1: Connect Trello
│   │   │   └── api-key.tsx          ← Step 2: Enter Anthropic API key
│   │   ├── dashboard/
│   │   │   ├── index.tsx            ← Board selector
│   │   │   └── $boardId.tsx         ← Active session view
│   │   ├── settings/
│   │   │   └── index.tsx            ← Manage Trello connection + Anthropic API key
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...all].ts      ← Better Auth catch-all (sign-in, callbacks, session, link)
│   │       ├── settings.apikey.ts   ← POST/DELETE /api/settings/apikey — save or remove key
│   │       ├── settings.status.ts   ← GET /api/settings/status — returns {trelloLinked, hasApiKey}
│   │       ├── trello.boards.ts     ← GET /api/trello/boards
│   │       ├── trello.cards.ts      ← GET /api/trello/cards?boardId=
│   │       ├── trello.checklist.ts  ← PATCH /api/trello/checklist — mark item done
│   │       └── claude.session.ts    ← POST /api/claude/session — start Claude Code run
│   ├── components/
│   │   ├── AuthForm.tsx             ← Shared email/password form (sign-in + register)
│   │   ├── ConnectTrello.tsx        ← Trello OAuth link button + connection status badge
│   │   ├── ApiKeyForm.tsx           ← Anthropic API key input, save, and revoke
│   │   ├── OnboardingSteps.tsx      ← Step indicator for the onboarding flow
│   │   ├── BoardPanel.tsx           ← Live Trello board view (cards + checklists)
│   │   ├── CardItem.tsx             ← Single Trello card with checklist items
│   │   ├── ChecklistItem.tsx        ← Individual checklist row with status indicator
│   │   ├── SessionLog.tsx           ← Streaming Claude Code output log
│   │   └── ui/                      ← Shared design system components
│   ├── lib/
│   │   ├── auth.ts                  ← Better Auth server config (email/password + Trello linking)
│   │   ├── auth-client.ts           ← Better Auth browser client
│   │   ├── db/
│   │   │   ├── index.ts             ← Drizzle client (Turso/libSQL connection)
│   │   │   └── schema.ts            ← All table definitions (users, sessions, accounts, user_settings)
│   │   ├── encrypt.ts               ← AES-256-GCM encrypt/decrypt helpers for API keys
│   │   ├── trello.ts                ← Trello API client (typed wrappers)
│   │   ├── claude.ts                ← Anthropic SDK + Claude Code session helpers
│   │   ├── prompts.ts               ← Prompt templates for Claude Code
│   │   └── types.ts                 ← Shared TypeScript types
│   ├── hooks/
│   │   ├── useBoardData.ts          ← TanStack Query hook for board + cards
│   │   ├── useIntegrationStatus.ts  ← Hook: checks trelloLinked + hasApiKey for routing
│   │   └── useClaudeSession.ts      ← Hook managing active Claude Code run state
│   └── styles/
│       └── globals.css              ← Tailwind base + custom variables
├── drizzle/
│   └── migrations/                  ← Auto-generated Drizzle migration files
├── drizzle.config.ts                ← Drizzle Kit config
├── server/
│   └── index.ts                     ← TanStack Start server entry
├── .env.example
├── app.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values before running locally.

```bash
# Better Auth
BETTER_AUTH_SECRET=           # Random 32+ char string — signs sessions and tokens
BETTER_AUTH_URL=http://localhost:3000

# Turso — cloud SQLite database
# Create a database at https://turso.tech, then:
#   turso db show <db-name> --url   → TURSO_DATABASE_URL
#   turso db tokens create <db-name> → TURSO_AUTH_TOKEN
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=

# Encryption — used to encrypt each user's Anthropic API key at rest
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=               # 64 hex chars = 32 bytes = AES-256 key

# Trello — your app's OAuth credentials (users connect their own boards via this)
# From https://trello.com/app-key
TRELLO_API_KEY=
TRELLO_API_SECRET=
# Callback URL auto-handled by Better Auth:
# {BETTER_AUTH_URL}/api/auth/callback/trello

# GitHub — OAuth credentials for GitHub integration
# From https://github.com/settings/developers (OAuth Apps)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# GitLab — OAuth credentials for GitLab integration
# From https://gitlab.com/-/user_settings/applications
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=

# App
BASE_URL=http://localhost:3000
```

> **`ANTHROPIC_API_KEY` is not a server environment variable.** Each user enters their own Anthropic API key in the app. It is encrypted with `ENCRYPTION_KEY` before being stored in the database. The server only decrypts it at the moment a Claude Code session is launched.

> **Never** hardcode secrets. Never commit `.env`. Always read from `process.env`.

---

## Key Integrations

### Authentication — Better Auth

This app uses **Better Auth** as the single authentication layer. It handles two distinct concerns:

1. **Email + password** — primary sign-in and registration, creates the user's identity in this app
2. **Trello OAuth** — a secondary "connected account" linked to the user after login, stores the Trello API token

These are **not interchangeable**. Email/password handles who the user is. Trello handles what boards they can access.

---

#### Server config (`app/lib/auth.ts`)

```typescript
import { betterAuth } from "better-auth";
import { emailAndPassword } from "better-auth/plugins";
import { genericOAuth } from "better-auth/plugins";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,

  plugins: [
    // ── Primary login: email + password ──────────────────────────────────────
    emailAndPassword({
      enabled: true,
      // Require email verification before allowing sign-in (set false for dev)
      requireEmailVerification: false,
      // Minimum password length
      minPasswordLength: 8,
    }),

    // ── Secondary connection: Trello (account linking) ────────────────────────
    genericOAuth({
      config: [
        {
          providerId: "trello",
          clientId: process.env.TRELLO_API_KEY!,
          clientSecret: process.env.TRELLO_API_SECRET!,
          authorizationUrl: "https://trello.com/1/OAuthAuthorizeToken",
          tokenUrl: "https://trello.com/1/OAuthGetAccessToken",
          requestTokenUrl: "https://trello.com/1/OAuthGetRequestToken",
          scopes: ["read", "write"],
          // Store the token as a linked account, not as the primary identity
          linking: true,
        },
      ],
    }),
  ],

  // Add a database adapter here for production (Drizzle, Prisma, etc.)
});
```

---

#### Client config (`app/lib/auth-client.ts`)

```typescript
import { createAuthClient } from "better-auth/client";
import {
  emailAndPasswordClient,
  genericOAuthClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [emailAndPasswordClient(), genericOAuthClient()],
});

export const { signIn, signUp, signOut, useSession, linkSocialAccount } =
  authClient;
```

---

#### Auth catch-all route (`app/routes/api/auth/[...all].ts`)

```typescript
import { auth } from "~/lib/auth";
import { createAPIFileRoute } from "@tanstack/start/api";

export const APIRoute = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
});
```

---

#### Registration (`app/routes/register.tsx`)

New users submit the `AuthForm` component in "register" mode:

```typescript
await signUp.email({
  email,
  password,
  name, // display name field on the form
});
// On success, redirect to /onboarding
```

---

#### Sign-in (`app/routes/index.tsx`)

Returning users submit the `AuthForm` component in "sign-in" mode:

```typescript
await signIn.email({ email, password });
// On success: if Trello linked → /dashboard, else → /onboarding
```

The `index.tsx` route should check for an existing session on load — if present, skip the form and redirect directly to `/dashboard` (or `/onboarding` if Trello not linked).

---

#### `AuthForm` component (`app/components/AuthForm.tsx`)

A single controlled form component used by both routes. Accepts a `mode: "sign-in" | "register"` prop. Handles field validation, loading state, and error display. Switches the submit handler and button label based on mode. Includes a link to toggle between the two modes.

---

#### Trello account linking flow

Used in `ConnectTrello.tsx`. This runs **after** the user is signed in:

```typescript
// Links the user's Trello account to their existing session
await linkSocialAccount({ provider: "trello" });
```

Better Auth stores the resulting Trello access token in the linked accounts table, tied to the user's ID.

---

#### Checking Trello connection status (`hooks/useTrelloConnection.ts`)

```typescript
import { useSession } from "~/lib/auth-client";

export function useTrelloConnection() {
  const { data: session } = useSession();
  const isConnected =
    session?.user?.accounts?.some(
      (a) => a.provider === "trello" && !!a.accessToken,
    ) ?? false;
  return { isConnected };
}
```

Use this hook to gate the dashboard: if `!isConnected`, render `<ConnectTrello />` before allowing board selection.

---

#### Onboarding flow (`app/routes/onboarding/`)

Onboarding is a **two-step wizard** shown to new users after registration (and to returning users who are missing either integration):

- **Step 1 — Connect Trello** (`onboarding/trello.tsx`): renders `<ConnectTrello />`. On success, advances to step 2.
- **Step 2 — Anthropic API key** (`onboarding/api-key.tsx`): renders `<ApiKeyForm />`. On save, redirects to `/dashboard`.

The `OnboardingSteps` component renders a step indicator at the top of both pages. `useIntegrationStatus` drives which step to show and when to skip to the dashboard.

---

#### Checking integration status (`hooks/useIntegrationStatus.ts`)

```typescript
// Replaces the old useTrelloConnection hook — covers both integrations
export function useIntegrationStatus() {
  const { data } = useQuery({
    queryKey: ["settings", "status"],
    queryFn: () => fetchIntegrationStatus(), // calls GET /api/settings/status
  });
  return {
    trelloLinked: data?.trelloLinked ?? false,
    hasApiKey: data?.hasApiKey ?? false,
    isReady: (data?.trelloLinked && data?.hasApiKey) ?? false,
  };
}
```

Use `isReady` to gate dashboard access. If `!trelloLinked`, send to `/onboarding/trello`. If `trelloLinked && !hasApiKey`, send to `/onboarding/api-key`.

---

### Database — Drizzle + Turso

Better Auth requires a database to persist users, sessions, and linked accounts. We use **Turso** (hosted libSQL — cloud SQLite) accessed via the `@libsql/client` driver and Drizzle ORM. Turso has a generous free tier and works identically to SQLite so the schema is unchanged.

#### Schema (`app/lib/db/schema.ts`)

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Better Auth manages these tables — define them to match BA's expected shape
export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const sessions = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
});

export const accounts = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verifications = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

// Our custom table — one row per user
export const userSettings = sqliteTable("user_settings", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // Anthropic API key encrypted with AES-256-GCM via encrypt.ts
  // Format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
  encryptedAnthropicApiKey: text("encryptedAnthropicApiKey"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});
```

#### Drizzle client (`app/lib/db/index.ts`)

```typescript
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

#### Drizzle config (`drizzle.config.ts`)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
```

Wire Better Auth to use the Drizzle adapter in `auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "~/lib/db";
import * as schema from "~/lib/db/schema";

export const auth = betterAuth({
  // ...
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  // libSQL is SQLite-compatible — use "sqlite" as the provider
  // ...
});
```

---

### API Key Encryption (`app/lib/encrypt.ts`)

User Anthropic API keys are encrypted at rest using **AES-256-GCM** with Node.js's built-in `crypto` module. A unique IV is generated per encryption operation. The result is stored as `iv:authTag:ciphertext` in the database.

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(stored: string): string {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
```

> `encrypt` and `decrypt` are **server-only**. Never import `encrypt.ts` in client-side code.

---

### User Settings API

#### Save API key (`app/routes/api/settings.apikey.ts`)

```typescript
// POST /api/settings/apikey  { apiKey: string }
// Validates the key starts with "sk-ant-", encrypts it, upserts user_settings row
// DELETE /api/settings/apikey — sets encryptedAnthropicApiKey to null
```

Validate that the key matches the pattern `sk-ant-api03-...` before encrypting. Return a success boolean — never return the key or its encrypted form to the client.

#### Integration status (`app/routes/api/settings.status.ts`)

```typescript
// GET /api/settings/status
// Returns: { trelloLinked: boolean, hasApiKey: boolean }
// Checks accounts table for trello providerId, checks user_settings for non-null key
// Never returns the actual key or token values
```

#### `ApiKeyForm` component (`app/components/ApiKeyForm.tsx`)

- Password-type input (masked) for the API key
- On submit: POST to `/api/settings/apikey`, invalidate `['settings', 'status']` query
- Shows a status indicator: "API key saved ✓" or "No key saved"
- Shows a "Remove key" button when a key is already stored (calls DELETE)
- Includes a link to [console.anthropic.com](https://console.anthropic.com) with instructions on where to get the key
- **Never** displays the stored key, even partially — only shows whether one exists

---

### Settings Page (`app/routes/settings/index.tsx`)

The settings page has two sections:

1. **Trello** — shows connection status, a disconnect button (calls `unlinkAccount`), and a re-connect button
2. **Anthropic API key** — renders `<ApiKeyForm />` for updating or revoking the key

This page is accessible from the dashboard nav at any time. Protect it with session check — redirect to `/` if unauthenticated.

---

#### Accessing the Trello token and Anthropic API key in server functions

```typescript
import { auth } from "~/lib/auth";
import { db } from "~/lib/db";
import { decrypt } from "~/lib/encrypt";
import { userSettings } from "~/lib/db/schema";
import { eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/start";

export const fetchBoards = createServerFn().handler(async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new Error("Unauthenticated");

  // Retrieve the linked Trello account's access token
  const trelloAccount = await auth.api.getLinkedAccount({
    userId: session.user.id,
    providerId: "trello",
  });
  if (!trelloAccount?.accessToken)
    throw new Error("Trello account not connected");

  return getTrelloBoards(trelloAccount.accessToken);
});

// Starting a Claude session — requires both Trello token AND user's Anthropic key
export const startClaudeSession = createServerFn().handler(
  async ({ request, data }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new Error("Unauthenticated");

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    });
    if (!settings?.encryptedAnthropicApiKey)
      throw new Error("Anthropic API key not configured");

    // Decrypt only at the moment of use — never store the plaintext
    const anthropicApiKey = decrypt(settings.encryptedAnthropicApiKey);

    // Pass the key into the Claude Code session launcher
    return launchClaudeSession({ anthropicApiKey, boardData: data.boardData });
  },
);
```

---

### Trello API

- **Auth**: The Trello OAuth 1.0a flow is handled by Better Auth's `genericOAuth` plugin during account linking. Once linked, retrieve the access token server-side via `auth.api.getLinkedAccount({ userId, providerId: "trello" })` and pass it to all Trello API calls. Never re-run the OAuth flow unless the token is missing or expired.
- **Base URL**: `https://api.trello.com/1/`
- **Key endpoints used**:
  - `GET /members/me/boards` — list user's boards
  - `GET /boards/{id}/cards` — all cards on a board
  - `GET /cards/{id}/checklists` — checklists on a card
  - `PUT /cards/{id}/checkItem/{checkItemId}` — update checklist item state (`complete` / `incomplete`)
  - `POST /tokens/{token}/webhooks` — register webhook for real-time updates (optional, fall back to polling)
- All Trello calls go through `app/lib/trello.ts` — **never** call the Trello API directly from components.

### Claude Code SDK

- Use `@anthropic-ai/claude-code` to spawn a Claude Code session programmatically.
- Sessions are initiated server-side from `app/routes/api/claude.session.ts`.
- The session receives:
  1. A **system prompt** (from `app/lib/prompts.ts`) describing the Trello board structure
  2. The list of cards and checklist items as structured JSON
  3. Instructions to call back to `/api/trello/checklist` via tool use or a side-effect hook when an item is completed
- Stream the session output back to the client via Server-Sent Events (SSE) and display in `SessionLog.tsx`.

### Prompt Architecture (`app/lib/prompts.ts`)

The system prompt given to Claude Code **must** include:

```
You are operating on a codebase. You have been given a Trello board containing tasks.
Work through each card and checklist item in order.
For each checklist item you complete, call the checkItem tool with the checkItemId.
Do not mark items complete unless the code change has actually been made and verified.
```

The user prompt should include the board JSON serialized as:

```json
{
  "board": { "id": "...", "name": "..." },
  "cards": [
    {
      "id": "...",
      "name": "...",
      "checklists": [
        {
          "id": "...",
          "items": [{ "id": "...", "name": "...", "state": "incomplete" }]
        }
      ]
    }
  ]
}
```

---

## TanStack Patterns to Follow

### Router

- All routes live in `app/routes/` using **file-based routing**
- Use `createFileRoute` for every route
- Loaders fetch server data at the route level — do not fetch in components
- Use `loaderData` from `useLoaderData()` as the initial seed for TanStack Query

### Query

- All server state goes through **TanStack Query** (`useQuery`, `useMutation`)
- Query keys follow the pattern: `['trello', 'boards']`, `['trello', 'cards', boardId]`
- Mutations that touch Trello (e.g. checking off an item) should `invalidateQueries` on the relevant board/card keys
- Polling interval for board data: **5000ms** (while a Claude session is active), **0** (when idle)

### Server Functions

- Use TanStack Start's `createServerFn` for any data fetching that needs server-side secrets
- Never expose `ENCRYPTION_KEY`, `TRELLO_API_SECRET`, or any decrypted user API key to the client bundle
- Always authenticate (`getSession`) before accessing any user-specific DB row

---

## Data Flow Diagram

```
User Browser
    │
    │  1. signUp.email() or signIn.email()
    ▼
Better Auth → email/password verified → session cookie set
    │
    │  2. linkSocialAccount({ provider: "trello" })  [onboarding step 1]
    ▼
Better Auth → Trello OAuth 1.0a → token stored in accounts table (DB)
    │
    │  3. POST /api/settings/apikey { apiKey }  [onboarding step 2]
    ▼
Server: validate → encrypt(apiKey) → store in user_settings table (DB)
    │
    │  4. Select board + start Claude session
    ▼
TanStack Start Server
    │
    ├── auth.api.getSession() → verify user
    ├── auth.api.getLinkedAccount("trello") → Trello token
    ├── db.query.userSettings → decrypt(encryptedAnthropicApiKey)
    │
    ├── Fetch board/cards from Trello API
    │       └── trello.ts (token-injected)
    │
    ├── Build structured prompt (prompts.ts)
    │
    ├── Spawn Claude Code session (claude.ts)
    │       └── @anthropic-ai/claude-code SDK (user's own API key)
    │
    └── Stream output → SSE → SessionLog.tsx
            │
            └── On task complete:
                    PATCH /api/trello/checklist
                        └── Trello PUT /cards/{id}/checkItem/{id}
                                └── TanStack Query invalidation
                                        └── BoardPanel re-renders ✓
```

---

## Claude Code Callback Mechanism

When Claude Code completes a checklist item inside the codebase, it needs to signal the app. There are two approaches — implement **both** and prefer the first:

### Option A — Tool Use (preferred)

Register a custom tool called `check_trello_item` in the Claude Code session:

```typescript
{
  name: "check_trello_item",
  description: "Mark a Trello checklist item as complete once the corresponding code task is done.",
  input_schema: {
    type: "object",
    properties: {
      checkItemId: { type: "string", description: "The Trello checklist item ID" },
      cardId: { type: "string", description: "The Trello card ID" }
    },
    required: ["checkItemId", "cardId"]
  }
}
```

Handle tool calls in the session streaming loop and call the Trello API from the server.

### Option B — Comment Parsing (fallback)

Parse Claude Code's output for a structured marker:

```
TRELLO_CHECK: cardId=<id> checkItemId=<id>
```

The SSE handler on the server detects this and calls Trello.

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server (hot reload)
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format

# Build for production
pnpm build

# Start production server
pnpm start
```

---

## Implementation Phases

Phases 1–14 are complete. See **PROGRESS.md** for detailed phase history and sub-phase checklists.

Phases 15–20 are planned below with full architecture details.

---

## Parallel Agents Architecture (Phase 11)

One agent per card, each in an isolated **git worktree**. Configurable `maxConcurrency` (default 3, max 5). Merges sequentially with conflict detection. Per-agent cost budget ($2 default). Key files: `src/lib/parallel.ts`, `src/lib/git.ts`, `src/lib/claude.ts` (`launchCardAgent()`).

---

## Multi-AI Provider Architecture (Phase 12)

Claude (via Agent SDK), OpenAI (`gpt-4o`), and Groq (`llama-3.3-70b`) supported. `ProviderAdapter` interface + factory in `src/lib/providers/`. Generic agent loop with function calling for non-Claude providers. Per-provider API keys stored in `provider_keys` table (encrypted). Key validation: Claude `sk-ant-api03-`, OpenAI `sk-` (not `sk-ant-`), Groq `gsk_`.

---

## Task Source Integrations (Phases 13–14)

### Shared Pattern

All task sources (Trello, GitHub, GitLab) follow the same architecture:
- OAuth token stored in `account` table with source-specific `providerId`
- Custom OAuth flow: `authorize` → `callback` → `connect` API routes
- Source-specific API client in `src/lib/{source}/client.ts`
- MCP tools for task updates in `src/lib/{source}/tools.ts`
- Shared markdown task list parser in `src/lib/tasks/parser.ts` (GitHub/GitLab)
- Unified `TaskSource`, `TaskCard`, `TaskBoardData` types in `src/lib/tasks/types.ts`
- Dashboard routes: `/dashboard/$boardId` (Trello), `/dashboard/github/$owner/$repo`, `/dashboard/gitlab/$projectId`

### Environment Variables

```bash
GITHUB_CLIENT_ID=         # From GitHub OAuth App settings
GITHUB_CLIENT_SECRET=
GITLAB_CLIENT_ID=         # From GitLab OAuth Application settings
GITLAB_CLIENT_SECRET=
```

### Key Differences

| Aspect | GitHub | GitLab |
|--------|--------|--------|
| Issue ID field | `number` | `iid` (project-scoped) |
| Body field | `body` | `description` |
| Close method | `PATCH { state: "closed" }` | `PUT { state_event: "close" }` |
| PR/MR | Pull Request | Merge Request |
| API base | `api.github.com` | `gitlab.com/api/v4` |

---

## Phase 15 — Session History & Persistence

Sessions are currently fire-and-forget — once the SSE stream ends, all context is lost. This phase adds a persistent record of every agent session so users can review what happened, see costs, and resume or retry failed runs.

### Database Schema

Two new tables in `src/lib/db/schema.ts`:

```typescript
export const agentSessions = sqliteTable("agent_session", {
  id: text("id").primaryKey(), // nanoid
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Task source context
  source: text("source").notNull(), // "trello" | "github" | "gitlab"
  sourceIdentifier: text("sourceIdentifier").notNull(), // boardId, "owner/repo", or projectId
  sourceName: text("sourceName").notNull(), // human-readable board/repo name
  // AI provider
  providerId: text("providerId").notNull(), // "claude" | "openai" | "groq"
  // Session config
  mode: text("mode").notNull(), // "sequential" | "parallel"
  maxConcurrency: integer("maxConcurrency"), // null for sequential
  initialMessage: text("initialMessage"), // user's --message / chat input
  // Status
  status: text("status").notNull(), // "running" | "completed" | "failed" | "cancelled"
  errorMessage: text("errorMessage"), // populated on failure
  // Cost tracking (raw values from provider — see Phase 16 for analytics)
  inputTokens: integer("inputTokens").notNull().default(0),
  outputTokens: integer("outputTokens").notNull().default(0),
  totalCostCents: integer("totalCostCents").notNull().default(0), // USD cents to avoid floats
  // Timestamps
  startedAt: integer("startedAt", { mode: "timestamp" }).notNull(),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const sessionEvents = sqliteTable("session_event", {
  id: text("id").primaryKey(), // nanoid
  sessionId: text("sessionId")
    .notNull()
    .references(() => agentSessions.id, { onDelete: "cascade" }),
  // Event data
  type: text("type").notNull(), // "message" | "tool_call" | "tool_result" | "task_completed" | "error" | "agent_started" | "agent_finished" | "merge_result"
  agentIndex: integer("agentIndex"), // for parallel sessions — which agent produced this event
  cardId: text("cardId"), // task source card/issue ID this event relates to
  content: text("content").notNull(), // JSON-serialized event payload
  // Ordering
  sequence: integer("sequence").notNull(), // monotonically increasing per session
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
});
```

**Design decisions:**
- `totalCostCents` is stored as integer cents to avoid floating-point rounding issues
- `sessionEvents` stores all SSE events in order, enabling full log replay without streaming from the provider again
- `content` is JSON text — structure varies by `type` but always includes a human-readable `summary` field for list views
- `sequence` enables deterministic replay ordering even if timestamps collide

### Session Lifecycle

The session route (`src/routes/api/session.ts`) is updated to:

1. **On start**: Insert an `agentSessions` row with `status: "running"`, return the `sessionId` in the SSE stream header
2. **During streaming**: Each SSE event is written to `sessionEvents` in a fire-and-forget batch (buffered, flushed every 500ms or 20 events)
3. **On completion**: Update `agentSessions` with `status: "completed"`, `completedAt`, final token counts and cost
4. **On error**: Update `status: "failed"`, populate `errorMessage`
5. **On client disconnect**: Update `status: "cancelled"` (the existing abort signal handling already detects this)

For parallel sessions, each `ParallelEvent` is stored as a `sessionEvent` with `agentIndex` set to the worker index.

### API Routes

```
GET  /api/sessions                    → list user's sessions (paginated, newest first)
GET  /api/sessions/:sessionId         → session detail (metadata + summary stats)
GET  /api/sessions/:sessionId/events  → paginated event log (supports ?offset=&limit=)
POST /api/sessions/:sessionId/retry   → re-run a failed/cancelled session with same config
DELETE /api/sessions/:sessionId       → soft-delete (or hard-delete — user choice)
```

All routes are authenticated and scoped to the requesting user's sessions only.

**Query parameters for list endpoint:**
- `?source=trello|github|gitlab` — filter by task source
- `?status=running|completed|failed|cancelled` — filter by status
- `?limit=20&offset=0` — pagination
- `?sort=newest|oldest|costliest` — sort order

### Types (`src/lib/types.ts`)

```typescript
export interface AgentSessionSummary {
  id: string;
  source: TaskSource;
  sourceIdentifier: string;
  sourceName: string;
  providerId: AiProviderId;
  mode: "sequential" | "parallel";
  status: "running" | "completed" | "failed" | "cancelled";
  inputTokens: number;
  outputTokens: number;
  totalCostCents: number;
  tasksCompleted: number; // count of "task_completed" events
  tasksTotal: number; // total tasks at session start
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null; // computed: completedAt - startedAt
}

export interface SessionEvent {
  id: string;
  type: string;
  agentIndex: number | null;
  cardId: string | null;
  content: Record<string, unknown>;
  sequence: number;
  timestamp: Date;
}
```

### Web UI

New routes:
- `/history` — session list page with filters and search
- `/history/$sessionId` — session detail page with log replay

**`/history` page:**
- Table view using TanStack Table: columns for source icon, board/repo name, provider, mode, status badge, tasks completed (e.g. "4/6"), cost, duration, date
- Filter bar: source dropdown, status dropdown, date range picker
- Click a row to navigate to detail view
- Empty state: "No sessions yet — start one from the dashboard"

**`/history/$sessionId` page:**
- Header: session metadata (source, provider, mode, status, cost, duration)
- Two tabs: "Log" and "Tasks"
  - **Log tab**: Scrollable event log (same rendering as `SessionLog.tsx` but reading from DB instead of SSE). For parallel sessions, filterable by agent. Auto-scrolls to bottom, with "Jump to error" button if status is failed
  - **Tasks tab**: List of cards/issues with completion status at time of session end
- Action buttons: "Retry" (for failed/cancelled), "Delete"
- Sidebar link added under existing nav

**Query keys:**
- `['sessions']` — session list
- `['sessions', sessionId]` — session detail
- `['sessions', sessionId, 'events']` — event log

### CLI

New `history` command:
- `taskpilot-cli history` — list recent sessions (last 10)
- `taskpilot-cli history --all` — list all sessions
- `taskpilot-cli history <sessionId>` — show session detail with log
- `taskpilot-cli history <sessionId> --events` — stream full event log to stdout

### Sub-phases

- **15a: Schema & types** — `agentSessions` and `sessionEvents` tables, migration, types
- **15b: Session write path** — Update session route to create/update `agentSessions`, buffer and flush `sessionEvents` during streaming
- **15c: API routes** — CRUD endpoints for sessions and events with pagination and filters
- **15d: History list UI** — `/history` route with TanStack Table, filters, sidebar link
- **15e: Session detail UI** — `/history/$sessionId` route with log replay and retry action
- **15f: CLI history command** — `history` command with list and detail views

---

## Phase 16 — Cost Tracking & Analytics

Users supply their own API keys and need visibility into what they're spending. This phase builds on the `agentSessions` table from Phase 15 to provide cost analytics.

### Cost Calculation

Each provider reports token usage differently. Normalize to a common format in `src/lib/providers/cost.ts`:

```typescript
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CostBreakdown {
  inputCostCents: number;
  outputCostCents: number;
  totalCostCents: number;
}

// Price per million tokens (in cents) — update when providers change pricing
const PRICING: Record<AiProviderId, { inputCentsPerMillion: number; outputCentsPerMillion: number }> = {
  claude: { inputCentsPerMillion: 300, outputCentsPerMillion: 1500 },   // Claude Sonnet 4
  openai: { inputCentsPerMillion: 250, outputCentsPerMillion: 1000 },   // GPT-4o
  groq:   { inputCentsPerMillion: 59,  outputCentsPerMillion: 79 },     // Llama 3.3 70B
};

export function calculateCost(providerId: AiProviderId, usage: TokenUsage): CostBreakdown {
  const prices = PRICING[providerId];
  const inputCostCents = Math.ceil((usage.inputTokens / 1_000_000) * prices.inputCentsPerMillion);
  const outputCostCents = Math.ceil((usage.outputTokens / 1_000_000) * prices.outputCentsPerMillion);
  return {
    inputCostCents,
    outputCostCents,
    totalCostCents: inputCostCents + outputCostCents,
  };
}
```

**Token extraction per provider:**
- **Claude**: `usage.input_tokens` / `usage.output_tokens` from SDK response
- **OpenAI**: `response.usage.prompt_tokens` / `response.usage.completion_tokens`
- **Groq**: `response.usage.prompt_tokens` / `response.usage.completion_tokens` (same shape as OpenAI)

The `ProviderAdapter` interface gets a new method: `extractUsage(raw: unknown): TokenUsage`. Each adapter implements it to pull tokens from its native response format.

### Budget System

Per-user optional spending limits stored in `user_settings`:

```typescript
// Add to user_settings table
monthlyBudgetCents: integer("monthlyBudgetCents"), // null = no limit
budgetAlertThreshold: integer("budgetAlertThreshold").default(80), // percentage (0-100)
```

**Enforcement:**
- Before launching a session, sum `totalCostCents` for the current calendar month from `agentSessions`
- If sum >= `monthlyBudgetCents`, reject with a clear error: "Monthly budget of $X.XX reached. Update your budget in Settings."
- If sum >= `budgetAlertThreshold`% of budget, include a warning in the session start response (shown as a banner in UI)
- Budget is advisory for the current session — once started, a session runs to completion (the per-agent $2 cap from Phase 11 still applies)

### API Routes

```
GET /api/analytics/summary    → current month: total spend, session count, tasks completed, by provider
GET /api/analytics/daily      → daily cost breakdown for last 30 days (for chart)
GET /api/analytics/providers  → cost comparison across providers (for pie chart)
```

All routes aggregate from `agentSessions` using Drizzle's `sql` template for efficient GROUP BY queries. Scoped to the authenticated user.

### Web UI

New route: `/analytics` — accessible from sidebar under a "Usage" section.

**Layout:**
- **Top row**: Summary cards — "This Month" spend (large number), session count, tasks completed, avg cost per session
- **Chart area**: Line/bar chart showing daily spend over last 30 days (use a lightweight chart lib — `recharts` or CSS-only bar chart to avoid heavy deps)
- **Provider breakdown**: Horizontal stacked bar or pie chart showing spend by provider
- **Budget section**: Current budget setting with progress bar, edit button to change limit and alert threshold
- **Session cost table**: Top 10 costliest sessions with links to session detail (Phase 15)

### Settings Integration

Add a "Budget" section to the Settings page:
- Monthly budget input (dollar amount, stored as cents)
- Alert threshold slider (default 80%)
- Current month progress bar: `$spent / $budget`
- "Remove budget" button to clear the limit

### CLI

- `taskpilot-cli usage` — show current month summary (total spend, sessions, tasks)
- `taskpilot-cli usage --month 2026-02` — show specific month
- After each `run` command, print a one-line cost summary: "Session cost: $0.42 (1,234 input + 567 output tokens)"

### Sub-phases

- **16a: Cost calculation** — `src/lib/providers/cost.ts` with pricing table, `calculateCost()`, `extractUsage()` on each adapter
- **16b: Token tracking** — Update session write path to accumulate tokens from each provider response and write to `agentSessions`
- **16c: Budget schema & enforcement** — Add budget columns to `user_settings`, pre-session budget check, warning banner
- **16d: Analytics API routes** — Summary, daily, and provider breakdown endpoints
- **16e: Analytics UI** — `/analytics` route with summary cards, charts, budget management
- **16f: Settings budget section** — Budget input and threshold on Settings page
- **16g: CLI usage command** — `usage` command, post-session cost summary line

---

## Phase 17 — Smart Task Ordering & Dependencies

Currently agents process cards/issues in list order with no awareness of dependencies. This phase parses dependency relationships and topologically sorts tasks for optimal execution order.

### Dependency Detection

Dependencies are expressed differently per task source. Parse all of them in `src/lib/tasks/dependencies.ts`:

**Trello:**
- Card labels: `blocked-by:CARD_SHORT_ID` or `depends-on:CARD_SHORT_ID`
- Card description: `Depends on: #123` (short ID reference)
- Checklist item names containing `[after CARD_NAME]` or `[blocked by CARD_NAME]`

**GitHub:**
- Issue body: `Depends on #123`, `Blocked by #456`, `Requires #789`
- Issue labels: `blocked`, `depends-on-<number>`
- Tasklist syntax: `- [ ] #123` in a parent issue references a dependency

**GitLab:**
- Issue description: `Depends on #123`, `Blocked by #456`
- Issue links API: `GET /projects/:id/issues/:iid/links` returns related issues with `link_type: "is_blocked_by"`
- Labels: `blocked`, `depends-on-<iid>`

### Dependency Graph

```typescript
// src/lib/tasks/dependencies.ts

export interface TaskDependency {
  taskId: string;        // the task that has a dependency
  dependsOnId: string;   // the task it depends on
  source: "label" | "description" | "link" | "checklist"; // how it was detected
}

export interface DependencyGraph {
  tasks: Map<string, TaskCard>;
  edges: TaskDependency[];        // directed: dependsOnId → taskId
  executionOrder: string[];        // topologically sorted task IDs
  blocked: Map<string, string[]>;  // taskId → list of blocking taskIds
  cycles: string[][];              // detected cycles (error case)
}

export function buildDependencyGraph(cards: TaskCard[], deps: TaskDependency[]): DependencyGraph;
export function parseDependencies(cards: TaskCard[], source: TaskSource): TaskDependency[];
```

**Topological sort** uses Kahn's algorithm. If cycles are detected, they are reported to the user and the cyclic tasks are placed at the end of the execution order with a warning.

### Integration with Session Launch

The session route is updated:
1. After fetching cards/issues, call `parseDependencies()` to build the graph
2. Reorder the task list according to `executionOrder`
3. Include dependency context in the agent prompt: "Task X must be completed before Task Y because..."
4. For parallel sessions: tasks with unmet dependencies are held in a waiting queue. When a dependency completes, the blocked task is released to the worker pool

### Parallel Orchestrator Changes (`src/lib/parallel.ts`)

The existing `launchParallelSession()` processes cards from a simple queue. Update to:

```typescript
interface ParallelTask {
  card: TaskCard;
  dependencies: string[]; // IDs of cards that must complete first
  status: "waiting" | "ready" | "running" | "completed" | "failed";
}
```

- On start: mark tasks with no dependencies as `ready`, others as `waiting`
- Worker pool only picks from `ready` tasks
- When a task completes: scan `waiting` tasks, move any whose dependencies are all `completed` to `ready`
- If a task fails: mark all downstream dependents as `blocked` (new status) and emit a `ParallelEvent` explaining which tasks were skipped and why
- New event type: `dependency_resolved` — emitted when a blocked task becomes ready

### Web UI Updates

**Board/session view:**
- Show dependency arrows or indicators on the card list (e.g., "Blocked by: Card A, Card B" chip)
- Grey out blocked cards with a lock icon
- When a dependency resolves during a parallel session, animate the card becoming unblocked

**Dependency visualization** (optional, sub-phase):
- Simple DAG view showing task ordering with arrows between dependent tasks
- Highlight the critical path (longest chain of dependencies)

### CLI Updates

- During `run`, print dependency info: "Task 'Add auth' blocked by: 'Set up database' — waiting..."
- When a task unblocks: "Task 'Add auth' is now ready (dependency 'Set up database' completed)"
- `--no-deps` flag to skip dependency detection and process in original order

### Sub-phases

- **17a: Dependency parser** — `src/lib/tasks/dependencies.ts` with parsers for Trello, GitHub, GitLab dependency syntax
- **17b: Graph builder** — `buildDependencyGraph()` with topological sort (Kahn's algorithm), cycle detection
- **17c: Sequential integration** — Reorder task list in session prompt based on dependency graph
- **17d: Parallel integration** — Update orchestrator with dependency-aware task queue (waiting/ready/running states)
- **17e: Prompt updates** — Include dependency context in agent system/user prompts
- **17f: UI dependency indicators** — Show blocked/ready status, dependency chips on cards
- **17g: CLI dependency output** — Dependency info during `run`, `--no-deps` flag

---

## Phase 18 — PR/MR Automation

The MCP tools for `create_pull_request` and `create_merge_request` already exist but require the agent to decide when and how to use them. This phase adds automated PR/MR creation as a first-class feature with configurable behavior.

### Configuration

New user-level settings (stored in `user_settings` or a new `automation_settings` table):

```typescript
export interface PrAutomationConfig {
  enabled: boolean;                          // master toggle
  createPerCard: boolean;                    // one PR per card/issue (parallel mode) vs one PR for entire session
  autoDraft: boolean;                        // create as draft PR (default: true)
  autoRequestReview: boolean;                // request review from configured reviewers
  reviewers: string[];                       // GitHub usernames or GitLab user IDs
  branchNamingPattern: string;               // e.g. "taskpilot/{source}-{id}-{slug}"
  includeSessionSummary: boolean;            // add session cost/token summary to PR body
  autoLinkIssue: boolean;                    // add "Closes #123" / "Fixes #123" to PR body
}
```

Default config creates draft PRs with auto-linked issues, one per card in parallel mode.

### PR/MR Generation Flow

After a session (or per-card agent in parallel mode) completes successfully:

1. **Diff detection**: Check if the agent made any file changes (`git diff --stat` against the base branch)
2. **Skip if no changes**: If the diff is empty, skip PR creation and log "No code changes — skipping PR"
3. **Branch creation**: Create a branch following the naming pattern (already done in parallel mode via worktrees)
4. **Commit verification**: Ensure all changes are committed (the agent should have committed, but verify)
5. **Push**: Push the branch to the remote
6. **PR/MR creation**: Call the appropriate API:
   - **GitHub**: `POST /repos/{owner}/{repo}/pulls` with title, body, head branch, base branch, draft flag
   - **GitLab**: `POST /projects/{id}/merge_requests` with title, description, source branch, target branch
7. **Review request**: If configured, request reviews from the specified users
8. **Issue linking**: If `autoLinkIssue` is true, prepend "Closes #N" to the PR body
9. **Session event**: Write a `pr_created` event to `sessionEvents` with the PR URL

### PR Body Template (`src/lib/prompts.ts`)

```markdown
## Summary

{agent-generated summary of changes}

## Task Source

- **Source**: {Trello/GitHub/GitLab}
- **Card/Issue**: [{title}]({url})
- **Checklist items completed**: {count}/{total}

## Changes

{git diff --stat output}

## Session Details

- **Provider**: {provider name}
- **Duration**: {duration}
- **Cost**: ${cost}
- **Tokens**: {input} input / {output} output

---

*Created by [TaskPilot](https://github.com/JoshJAL/taskpilot)*
```

### Trello Handling

Trello doesn't have native PRs, but the automation can:
- Attach the PR URL to the Trello card via `POST /cards/{id}/attachments`
- Add a comment to the card with the PR link
- This requires the Trello token and the GitHub/GitLab token — both must be available

### API Routes

```
GET  /api/settings/automation       → get current PR automation config
PUT  /api/settings/automation       → update PR automation config
POST /api/sessions/:sessionId/pr    → manually trigger PR creation for a completed session
```

### Web UI

**Settings page** — new "PR Automation" section:
- Enable/disable toggle
- "One PR per card" vs "One PR per session" radio
- Draft PR checkbox
- Branch naming pattern input with preview
- Reviewer usernames input (tag-style, comma separated)
- "Include session summary" checkbox
- "Auto-link issues" checkbox

**Session detail page** (Phase 15):
- Show PR link if one was created, with status badge (open/merged/closed)
- "Create PR" button for completed sessions that don't have one yet

**Board session view:**
- After session completes, show a banner: "PR created: [#123 title](url)" with link

### CLI

- `--pr` flag on `run` command: create a PR after session completes (uses stored automation config, or defaults)
- `--no-pr` flag: skip PR creation even if automation is enabled
- `--reviewers user1,user2` flag: override configured reviewers for this run
- After PR creation, print: "Pull request created: https://github.com/owner/repo/pull/123"

### Sub-phases

- **18a: Automation config** — Schema, API routes, types for PR automation settings
- **18b: PR generation logic** — `src/lib/pr.ts` with diff detection, branch push, PR/MR creation via GitHub/GitLab clients
- **18c: PR body template** — Template builder with session metadata, diff stats, issue links
- **18d: Session integration** — Hook PR creation into session completion flow (both sequential and parallel)
- **18e: Trello PR attachment** — Attach PR URL to Trello cards when source is Trello
- **18f: Settings UI** — PR automation section on Settings page
- **18g: Session UI integration** — PR link display on session detail and board views
- **18h: CLI PR flags** — `--pr`, `--no-pr`, `--reviewers` flags on `run` command

---

## Phase 19 — Testing & CI

The project has zero tests. This phase adds a comprehensive test suite and CI pipeline.

### Test Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner and assertions (fast, native ESM, TypeScript) |
| **Testing Library** | React component tests (`@testing-library/react`) |
| **MSW** (Mock Service Worker) | API mocking for integration tests |
| **Playwright** | E2E browser tests for critical user flows |

### Test Structure

```
tests/
├── unit/
│   ├── lib/
│   │   ├── encrypt.test.ts           ← AES-256-GCM encrypt/decrypt round-trip
│   │   ├── cost.test.ts              ← Cost calculation for all providers
│   │   ├── dependencies.test.ts      ← Dependency parser + topological sort
│   │   ├── parser.test.ts            ← Markdown task list parser
│   │   └── git.test.ts               ← Git helper functions
│   ├── providers/
│   │   ├── factory.test.ts           ← Provider factory returns correct adapter
│   │   └── cost.test.ts              ← Token extraction per provider
│   └── tasks/
│       ├── adapters.test.ts          ← Trello → TaskCard adapter
│       └── types.test.ts             ← Type guard functions
├── integration/
│   ├── api/
│   │   ├── auth.test.ts              ← Sign-up, sign-in, session validation
│   │   ├── settings.test.ts          ← API key save/delete, status endpoint
│   │   ├── sessions.test.ts          ← Session CRUD, pagination, filters
│   │   └── analytics.test.ts         ← Cost aggregation queries
│   ├── trello/
│   │   ├── client.test.ts            ← Trello API client (MSW-mocked)
│   │   └── tools.test.ts             ← MCP tool execution
│   ├── github/
│   │   ├── client.test.ts            ← GitHub API client (MSW-mocked)
│   │   └── tools.test.ts             ← MCP tool execution
│   └── gitlab/
│       ├── client.test.ts            ← GitLab API client (MSW-mocked)
│       └── tools.test.ts             ← MCP tool execution
├── components/
│   ├── AuthForm.test.tsx             ← Form validation, submit handlers
│   ├── ApiKeyForm.test.tsx           ← Key save/delete, status display
│   ├── BoardPanel.test.tsx           ← Card rendering, checklist items
│   ├── SessionLog.test.tsx           ← Event rendering, scroll behavior
│   └── Sidebar.test.tsx              ← Navigation, collapse, active route
├── e2e/
│   ├── auth.spec.ts                  ← Register → sign in → sign out
│   ├── onboarding.spec.ts           ← Full onboarding flow (mocked OAuth)
│   ├── session.spec.ts              ← Start session → view log → check completion
│   └── settings.spec.ts             ← Update API key, connect/disconnect sources
└── setup/
    ├── vitest.setup.ts               ← Global test setup
    ├── msw-handlers.ts               ← MSW request handlers for all external APIs
    └── test-utils.tsx                ← Custom render with providers (QueryClient, Router)
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "jsdom", // for component tests
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**", "src/components/**"],
      exclude: ["src/lib/db/migrations/**"],
    },
  },
});
```

### MSW Handlers

Mock all external API calls (Trello, GitHub, GitLab, OpenAI, Groq) so tests never hit real services. The handlers return realistic fixture data matching the actual API shapes.

### CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint-and-type:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v4  # optional

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

### Package.json Scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

### Sub-phases

- **19a: Test infrastructure** — Install Vitest, Testing Library, MSW, Playwright. Create config files, setup, and test utils
- **19b: Unit tests** — Tests for pure functions: encrypt, cost, parser, dependencies, git helpers, provider factory
- **19c: Integration tests** — API route tests with MSW-mocked external services (auth, settings, sessions, analytics)
- **19d: Component tests** — React component tests with Testing Library (AuthForm, ApiKeyForm, BoardPanel, SessionLog, Sidebar)
- **19e: E2E tests** — Playwright tests for critical flows (auth, onboarding, session, settings)
- **19f: CI pipeline** — GitHub Actions workflow for lint, typecheck, test, build on push/PR
- **19g: Coverage & badges** — Coverage reporting, README badge, minimum coverage threshold (aim for 70%+)

---

## Phase 20 — Webhooks & Real-Time Updates

Replace polling with webhooks for task source updates. Add WebSocket support for real-time UI updates during and between sessions.

### Webhook Receivers

Each task source pushes updates to registered webhook endpoints:

```
POST /api/webhooks/trello     ← Trello model webhooks (card updates, checklist changes)
POST /api/webhooks/github     ← GitHub webhook events (issues, pull_request)
POST /api/webhooks/gitlab     ← GitLab webhook events (issue, merge_request)
```

**Trello webhooks:**
- Register via `POST /tokens/{token}/webhooks` with `callbackURL` and `idModel` (board ID)
- Events: `updateCard`, `updateCheckItemStateOnCard`, `createCard`, `deleteCard`
- Verify with HEAD request handshake (Trello sends HEAD to callback URL on registration)
- Validate webhook signature using HMAC-SHA1 of the request body + callback URL with the app secret

**GitHub webhooks:**
- Register via Settings or API: `POST /repos/{owner}/{repo}/hooks`
- Events: `issues` (opened, closed, edited), `pull_request` (opened, merged, closed)
- Validate `X-Hub-Signature-256` header using HMAC-SHA256 with the webhook secret

**GitLab webhooks:**
- Register via Settings or API: `POST /projects/:id/hooks`
- Events: `issue_events`, `merge_request_events`
- Validate `X-Gitlab-Token` header against stored secret

### Webhook Processing

```typescript
// src/lib/webhooks/processor.ts

export interface WebhookEvent {
  source: TaskSource;
  eventType: string;          // "card_updated" | "issue_closed" | "mr_merged" etc.
  sourceIdentifier: string;   // boardId, "owner/repo", projectId
  payload: Record<string, unknown>;
  receivedAt: Date;
}

export async function processWebhook(event: WebhookEvent): Promise<void> {
  // 1. Identify affected users (who has this board/repo connected?)
  // 2. Invalidate relevant cached data
  // 3. Broadcast update to connected WebSocket clients
  // 4. If a session is running on this board/repo, update the session's task state
}
```

### WebSocket Server

Add a WebSocket upgrade handler to the server for real-time client updates:

```typescript
// src/lib/websocket.ts

export interface WsMessage {
  type: "task_updated" | "session_status" | "webhook_event" | "cost_alert";
  userId: string;
  data: Record<string, unknown>;
}
```

**Client connection flow:**
1. Client connects to `ws://host/ws` with session cookie
2. Server authenticates the WebSocket connection using the same Better Auth session
3. Client subscribes to channels: `board:{boardId}`, `repo:{owner}/{repo}`, `project:{projectId}`, `user:{userId}`
4. Server broadcasts relevant events to subscribed clients

**What gets pushed:**
- Task source changes (card moved, issue closed, checklist item toggled) — replaces the 5s polling
- Session status changes (started, completed, failed) — for multi-device awareness
- Cost alerts (budget threshold reached) — from Phase 16
- PR/MR status changes (opened, merged) — from Phase 18

### Webhook Registration Management

New table for tracking registered webhooks:

```typescript
export const registeredWebhooks = sqliteTable("registered_webhook", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  source: text("source").notNull(),         // "trello" | "github" | "gitlab"
  sourceIdentifier: text("sourceIdentifier").notNull(), // boardId, "owner/repo", projectId
  webhookId: text("webhookId"),             // the ID returned by the source API
  secret: text("secret"),                   // webhook validation secret (encrypted)
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});
```

**Auto-registration:** When a user starts their first session on a board/repo, automatically register a webhook for that source. Deregister when the user disconnects the source.

### Web UI Updates

- Remove polling intervals from TanStack Query hooks — replace with WebSocket-triggered `invalidateQueries`
- Add a connection status indicator in the sidebar: green dot = WebSocket connected, red = disconnected
- Board view: cards update instantly when changes arrive via webhook (no more 5s delay)
- Session view: real-time status updates without polling

### Fallback

If WebSocket connection fails or webhooks can't be registered (e.g., user's Trello board is private and can't receive webhooks), fall back gracefully to the existing polling mechanism. The polling interval should only activate when the WebSocket is disconnected.

### Sub-phases

- **20a: Webhook endpoints** — POST handlers for Trello, GitHub, GitLab with signature validation
- **20b: Webhook processor** — Event normalization, user lookup, cache invalidation
- **20c: WebSocket server** — WS upgrade handler, authentication, channel subscriptions
- **20d: Client WebSocket hook** — `useWebSocket()` hook with auto-reconnect, channel subscription, query invalidation
- **20e: Webhook registration** — `registered_webhooks` table, auto-register on first session, deregister on disconnect
- **20f: Polling fallback** — Graceful degradation when WebSocket disconnects or webhooks unavailable
- **20g: UI indicators** — Connection status dot, instant updates, remove polling timers

---

## Code Style & Conventions

- **TypeScript strict mode** is enabled. No `any`. Use `unknown` + type guards where needed.
- **No default exports** except for route files (TanStack Router convention).
- All API response types should be defined in `app/lib/types.ts`.
- Component files: PascalCase. Utility/hook files: camelCase.
- Keep components **presentation-only** — data fetching lives in hooks or loaders.
- All Trello mutations go through a `useMutation` with **optimistic updates** — the checkbox should toggle immediately, then reconcile with server state.
- Use `invariant` (from `@tanstack/react-router`) for runtime assertions in loaders.

### Changelog Updates

When pushing changes that are large enough to be user-visible (new features, significant improvements, meaningful bug fixes), **add an entry to `src/lib/updates.ts`** before committing. This powers the in-app Updates page and the notification banner.

- Add the entry to the **top** of the `UPDATES` array (newest first)
- Use the `id` format `"YYYY-MM-DD-slug"`
- Include `details` sections with headings, descriptions, and code examples for anything non-trivial
- Set `type` to `"feature"`, `"improvement"`, or `"fix"`
- Small internal refactors, dependency bumps, or dev-only changes don't need an entry

### Documentation Requirements

When adding or changing user-visible features, **all three documentation surfaces must be updated**:

1. **Web app docs** (`src/routes/docs/web.tsx`) — Update the in-app documentation for the web UI. Add new steps, sections, or feature descriptions as needed.
2. **CLI docs** — Update both:
   - `cli/README.md` — The npm package README (flags tables, usage examples)
   - `src/routes/docs/cli.tsx` — The in-app CLI documentation page (CommandRef flags, examples)
3. **Frontend project** (`/home/joshjal/Projects/personal/claude-trello-frontend`) — Update landing page content, feature lists, or screenshots if the change affects what users see before signing in.

Not every change touches all three — use judgement. A CLI-only flag doesn't need frontend landing page updates. A UI-only feature doesn't need CLI docs. But if a feature spans both (like branch selection), update all relevant docs before committing.

---

## Security Notes

- **Better Auth** manages the user session and Trello linked account. Never read or write these manually outside of `auth.ts` and `auth-client.ts`.
- Passwords are **never stored in plaintext** — Better Auth hashes them with bcrypt. Never log or expose raw passwords.
- The session cookie is **HTTP-only** and signed with `BETTER_AUTH_SECRET` — never expose this secret.
- The Trello access token is stored in the `accounts` table (server-side only) and never sent to the client.
- **Anthropic API keys are encrypted at rest** using AES-256-GCM. The `ENCRYPTION_KEY` env var is the master secret — rotate it only with a migration that re-encrypts all stored keys. Never log the plaintext key.
- Decrypt the Anthropic API key **only at the moment a Claude session is launched** inside a `createServerFn`. Never store the decrypted value in memory longer than necessary, and never return it to the client.
- The `/api/settings/status` endpoint returns only `{ trelloLinked: boolean, hasApiKey: boolean }` — never the actual token or key values.
- `ApiKeyForm.tsx` must never display the stored key, even masked — only show whether one exists.
- Protect all `createServerFn` calls: check `getSession()` first, then retrieve per-user credentials from the DB. Throw distinct typed errors so the client can route to the correct recovery screen.
- Validate Anthropic API keys match `sk-ant-api03-...` before encrypting — reject anything that doesn't match.
- Rate limit `/api/claude/session` to one active session per user at a time.

---

## Phase 21 — Cloud Storage Workspaces (Google Drive & OneDrive)

TaskPilot currently operates on codebases — either local directories or GitHub/GitLab repos. But Trello boards aren't only for code. This phase adds **Google Drive** and **OneDrive** as workspace targets, letting AI agents read, write, and modify files in cloud storage folders. Users can point an agent at a folder of spreadsheets, documents, or any other files and use Trello cards to describe tasks like "update the Q3 revenue column," "create a summary doc from these CSVs," or "reformat all the spreadsheets to match this template."

### Core Concept: Workspaces

A **workspace** is the target directory an agent operates on. Currently workspaces are:
- **Local**: a filesystem path (local mode)
- **GitHub repo**: owner/repo accessed via GitHub API (cloud mode)
- **GitLab project**: project ID accessed via GitLab API (cloud mode)

This phase adds:
- **Google Drive folder**: a folder ID accessed via Google Drive API
- **OneDrive folder**: a folder path or ID accessed via Microsoft Graph API

The workspace determines which **tool set** the agent gets. Just as GitHub cloud mode gives the agent `read_file`, `write_file`, `edit_file`, `list_files`, and `search_files` backed by the GitHub API, cloud storage mode gives the agent equivalent tools backed by the Drive/OneDrive API.

### Authentication

Both providers use OAuth 2.0, following the same pattern as GitHub and GitLab:

| Provider | OAuth Flow | Scopes | Token Storage |
|----------|-----------|--------|---------------|
| **Google Drive** | OAuth 2.0 (authorization code) | `https://www.googleapis.com/auth/drive` | `account` table, `providerId: "google"` |
| **OneDrive** | OAuth 2.0 (authorization code via Microsoft Identity) | `Files.ReadWrite.All`, `User.Read` | `account` table, `providerId: "onedrive"` |

Both tokens are stored in the existing `account` table. Google tokens expire and need refresh (same pattern as GitLab). Microsoft tokens also expire and need refresh.

### Environment Variables

```bash
# Google Drive — from Google Cloud Console (APIs & Services > Credentials)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OneDrive — from Azure Portal (App registrations)
ONEDRIVE_CLIENT_ID=
ONEDRIVE_CLIENT_SECRET=
ONEDRIVE_TENANT_ID=              # "common" for multi-tenant, or a specific tenant ID
```

### API Clients

#### Google Drive (`src/lib/google/client.ts`)

```typescript
const GOOGLE_API = "https://www.googleapis.com";

export async function listFiles(token: string, folderId: string): Promise<DriveFile[]>;
export async function getFile(token: string, fileId: string): Promise<{ name: string; mimeType: string; content: string }>;
export async function updateFile(token: string, fileId: string, content: string, mimeType: string): Promise<void>;
export async function createFile(token: string, folderId: string, name: string, content: string, mimeType: string): Promise<{ id: string }>;
export async function deleteFile(token: string, fileId: string): Promise<void>;
export async function searchFiles(token: string, folderId: string, query: string): Promise<DriveFile[]>;

// Google Sheets specific
export async function getSpreadsheet(token: string, spreadsheetId: string): Promise<SpreadsheetData>;
export async function updateCells(token: string, spreadsheetId: string, range: string, values: string[][]): Promise<void>;
export async function appendRows(token: string, spreadsheetId: string, range: string, values: string[][]): Promise<void>;

// Folder navigation
export async function getFolders(token: string, parentId?: string): Promise<DriveFolder[]>;

// OAuth
export async function exchangeCodeForToken(code: string): Promise<GoogleTokenSet>;
export async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokenSet>;
```

**Key API endpoints:**
- `GET /drive/v3/files` — list files in a folder (with `q` parameter for folder scoping)
- `GET /drive/v3/files/{fileId}?alt=media` — download file content
- `PATCH /upload/drive/v3/files/{fileId}` — update file content
- `POST /upload/drive/v3/files` — create new file
- `GET /v4/spreadsheets/{id}` — read spreadsheet structure and values (Sheets API)
- `PUT /v4/spreadsheets/{id}/values/{range}` — update cells (Sheets API)

#### OneDrive (`src/lib/onedrive/client.ts`)

```typescript
const GRAPH_API = "https://graph.microsoft.com/v1.0";

export async function listFiles(token: string, folderPath: string): Promise<DriveItem[]>;
export async function getFile(token: string, itemPath: string): Promise<{ name: string; mimeType: string; content: string }>;
export async function updateFile(token: string, itemPath: string, content: string): Promise<void>;
export async function createFile(token: string, folderPath: string, name: string, content: string): Promise<{ id: string }>;
export async function deleteFile(token: string, itemPath: string): Promise<void>;
export async function searchFiles(token: string, query: string): Promise<DriveItem[]>;

// Excel specific (via Graph API Excel endpoints)
export async function getWorkbook(token: string, itemId: string): Promise<WorkbookData>;
export async function updateRange(token: string, itemId: string, worksheet: string, range: string, values: string[][]): Promise<void>;
export async function appendRows(token: string, itemId: string, worksheet: string, values: string[][]): Promise<void>;

// Folder navigation
export async function getFolders(token: string, parentPath?: string): Promise<DriveItem[]>;

// OAuth
export async function exchangeCodeForToken(code: string): Promise<OneDriveTokenSet>;
export async function refreshOneDriveToken(refreshToken: string): Promise<OneDriveTokenSet>;
```

**Key API endpoints:**
- `GET /me/drive/root/children` — list root folder
- `GET /me/drive/root:/{path}:/children` — list folder by path
- `GET /me/drive/items/{id}/content` — download file
- `PUT /me/drive/root:/{path}:/content` — upload/update file
- `GET /me/drive/items/{id}/workbook/worksheets` — list Excel worksheets
- `PATCH /me/drive/items/{id}/workbook/worksheets/{name}/range(address='{range}')` — update Excel cells

### Workspace Tool Set (`src/lib/providers/storage-tools.ts`)

A new tool set analogous to `web-tools.ts`, but for cloud storage. The AI agent receives these tools when the workspace is a Google Drive or OneDrive folder:

```typescript
export interface StorageToolContext {
  provider: "google" | "onedrive";
  token: string;
  folderId: string;       // Google Drive folder ID or OneDrive folder path
  folderName: string;     // Human-readable name
}

// Tool definitions:
// read_file      — read a file's content (text, CSV, JSON, etc.)
// write_file     — create or overwrite a file
// edit_file      — find-and-replace in a text file
// list_files     — list files in the workspace folder
// search_files   — search file names or content
// read_spreadsheet  — read spreadsheet data (Google Sheets or Excel)
// update_cells      — update specific cells in a spreadsheet
// append_rows       — add rows to a spreadsheet
// create_file       — create a new file in the folder
// delete_file       — delete a file
```

**File format handling:**
- **Text files** (`.txt`, `.md`, `.csv`, `.json`, `.xml`, `.yaml`): read/write as plain text
- **Google Sheets**: use the Sheets API to read/write structured data (the agent sees tabular data, not raw file bytes)
- **Excel files** (`.xlsx`): use the Graph API Excel endpoints for OneDrive, or download/re-upload for Google Drive
- **Google Docs**: export as Markdown for reading, import from Markdown for writing
- **Word/PDF**: export as text for reading (write creates new `.txt` or `.md`)
- **Binary files** (images, etc.): list and metadata only — no read/write of raw binary content

### Dashboard UI

#### Workspace Selector

A new **workspace picker** component (like `RepoLinker` but for cloud storage folders). Appears in `SessionControls` when the user has Google Drive or OneDrive connected.

For Trello boards in cloud mode, the user currently picks a linked GitHub/GitLab repo. This phase adds Google Drive and OneDrive as additional workspace options.

**Component: `WorkspaceSelector`** (`src/components/session/WorkspaceSelector.tsx`)
- Shows connected cloud storage providers
- Lets the user browse folders or search by name
- Displays the selected folder as a chip (like `RepoLinker`)
- Returns a workspace identifier: `google:{folderId}` or `onedrive:{folderPath}`

#### Dashboard Routes

No new dashboard routes needed — Google Drive and OneDrive are **workspaces**, not task sources. Tasks still come from Trello, GitHub, or GitLab. The workspace selector appears on existing dashboard pages when the user has a cloud storage provider connected.

### Session Flow

1. User selects a task source (Trello board, GitHub repo, or GitLab project)
2. User selects a workspace — now one of: local directory, GitHub repo, GitLab project, Google Drive folder, or OneDrive folder
3. Session launches with:
   - **System prompt** describing the workspace type and available tools
   - **Task data** from the task source (cards, issues, checklists)
   - **Storage tool set** for the selected workspace provider
   - **Task source tool set** for checking off items (Trello/GitHub/GitLab tools)

The session API route (`src/routes/api/claude/session.ts`) gets a new workspace type parameter and builds the appropriate tool set combination.

### System Prompts (`src/lib/providers/prompts.ts`)

New prompts for cloud storage workspaces:

```
STORAGE_GOOGLE_SYSTEM_PROMPT:
"You are operating on files in a Google Drive folder. You can read, write, edit, and search files.
For spreadsheets (Google Sheets), use read_spreadsheet, update_cells, and append_rows.
For text files, use read_file, write_file, and edit_file.
Work through each task card and checklist item in order..."

STORAGE_ONEDRIVE_SYSTEM_PROMPT:
"You are operating on files in a OneDrive folder. You can read, write, edit, and search files.
For Excel workbooks, use read_spreadsheet, update_cells, and append_rows.
For text files, use read_file, write_file, and edit_file.
Work through each task card and checklist item in order..."
```

### CLI Support

New `--workspace` flag on the `run` command:

```bash
# Use a Google Drive folder as the workspace
taskpilot run --workspace google:<folderId>

# Use a OneDrive folder as the workspace
taskpilot run --workspace onedrive:/path/to/folder

# Interactive: prompted to select a workspace if not specified
taskpilot run --source trello --workspace google
```

The CLI `setup` command is extended to support connecting Google Drive and OneDrive accounts.

### API Routes

```
GET  /api/google/authorize       → redirect to Google OAuth
GET  /api/google/callback        → handle OAuth callback, store token
POST /api/google/connect         → finalize connection
GET  /api/google/folders         → list folders (for workspace selector)
GET  /api/google/files           → list files in a folder

GET  /api/onedrive/authorize     → redirect to Microsoft OAuth
GET  /api/onedrive/callback      → handle OAuth callback, store token
POST /api/onedrive/connect       → finalize connection
GET  /api/onedrive/folders       → list folders
GET  /api/onedrive/files         → list files in a folder
```

### Database Changes

No new tables needed. Google and OneDrive tokens use the existing `account` table with `providerId: "google"` and `providerId: "onedrive"`. Token refresh follows the same pattern as GitLab (store refresh token, refresh before expiry via a `getValidGoogleToken` / `getValidOneDriveToken` helper).

The `useIntegrationStatus` hook and `/api/settings/status` endpoint are extended to include `googleDriveLinked` and `oneDriveLinked` booleans.

### Sub-phases

- **21a: Google OAuth** — authorize, callback, connect routes; token storage and refresh; `getValidGoogleToken` helper
- **21b: Google Drive client** — `src/lib/google/client.ts` with file CRUD, folder listing, search
- **21c: Google Sheets support** — spreadsheet read/write via Sheets API; structured data formatting for AI
- **21d: OneDrive OAuth** — authorize, callback, connect routes; token storage and refresh; `getValidOneDriveToken` helper
- **21e: OneDrive client** — `src/lib/onedrive/client.ts` with file CRUD, folder listing, search
- **21f: Excel support** — workbook read/write via Graph API Excel endpoints
- **21g: Storage tool set** — `src/lib/providers/storage-tools.ts` with tool definitions and execution for both providers
- **21h: Workspace selector UI** — `WorkspaceSelector` component, integration into `SessionControls`
- **21i: Session integration** — update session route to accept workspace type, build combined tool sets (storage + task source)
- **21j: System prompts** — storage-aware prompts for Google Drive and OneDrive workspaces
- **21k: Settings UI** — Google Drive and OneDrive connection/disconnection in Settings page
- **21l: CLI workspace support** — `--workspace` flag, `setup` command extension, interactive workspace selection
- **21m: Documentation** — update web docs, CLI docs, frontend docs for cloud storage workspaces

---

## Phase 22 — Desktop Application (Electron)

A native desktop app that combines the best of the web app and CLI: the visual dashboard UI with full local filesystem access and cloud storage workspace support. Built with Electron for Windows, Mac, and Linux.

### Why Electron

- **Node.js main process**: Full access to `fs`, `child_process`, `cwd` — the agent can work on local files directly, just like the CLI
- **Cloud storage tools**: The main process can run the generic agent loop (same as web mode) with full tool control, so Google Drive / OneDrive workspaces work properly — unlike the CLI where the Claude Agent SDK always injects built-in tools
- **React renderer**: Reuse the existing web app components (SessionControls, SessionLog, BoardPanel, WorkspaceTypePicker, etc.) directly
- **Cross-platform**: Single codebase → Windows (.exe), Mac (.dmg), Linux (.AppImage/.deb)
- **Auto-updates**: Electron Builder supports auto-update via GitHub Releases
- **No server dependency**: Can authenticate against `account.task-pilot.dev` OR run fully offline with local credentials

### Project Structure

New repo: `taskpilot-desktop` (separate from the web app and CLI)

```
taskpilot-desktop/
├── package.json
├── electron-builder.yml           ← Build config for all platforms
├── forge.config.ts                ← Electron Forge config (alternative to builder)
├── tsconfig.json
├── src/
│   ├── main/                      ← Electron main process (Node.js)
│   │   ├── index.ts               ← App entry, window creation, menu
│   │   ├── ipc.ts                 ← IPC handlers (renderer ↔ main process)
│   │   ├── auth.ts                ← Auth against task-pilot.dev API (session cookie storage)
│   │   ├── session-runner.ts      ← Agent session launcher (both local + cloud modes)
│   │   ├── providers/
│   │   │   ├── claude.ts          ← Claude Agent SDK wrapper (local mode)
│   │   │   ├── generic-agent.ts   ← Generic agent loop (cloud mode — same as web app)
│   │   │   ├── storage-tools.ts   ← Cloud storage tool set (reused from web app)
│   │   │   └── source-tools.ts    ← Task source tools (Trello/GitHub/GitLab)
│   │   ├── google/                ← Google Drive/Docs/Sheets API client (reused)
│   │   ├── onedrive/              ← OneDrive/Excel API client (reused)
│   │   └── store.ts               ← electron-store for local settings, session cookie
│   ├── renderer/                  ← Electron renderer process (React)
│   │   ├── index.html
│   │   ├── main.tsx               ← React entry
│   │   ├── App.tsx                ← Router + layout (reuses web app components)
│   │   ├── components/            ← Shared components (copied/imported from web app)
│   │   ├── hooks/                 ← Hooks adapted for IPC instead of fetch()
│   │   └── styles/
│   └── preload/
│       └── index.ts               ← Preload script — exposes IPC bridge to renderer
├── resources/
│   ├── icon.png                   ← App icon (1024x1024)
│   ├── icon.icns                  ← Mac icon
│   └── icon.ico                   ← Windows icon
└── dist/                          ← Build output
```

### Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Renderer (React)                     │
│                                                       │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │Dashboard │  │ Session  │  │ WorkspaceSelector  │   │
│  │ Boards   │  │  Log     │  │ (local/cloud)      │   │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘   │
│       │              │                  │              │
│       └──────────────┴──────────────────┘              │
│                      │ IPC                             │
├──────────────────────┼─────────────────────────────────┤
│                      │                                 │
│              ┌───────┴───────┐                         │
│              │  Preload      │                         │
│              │  (IPC bridge) │                         │
│              └───────┬───────┘                         │
│                      │                                 │
│              Main Process (Node.js)                    │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Auth          │  │ Session      │  │ Cloud      │  │
│  │ (API calls    │  │ Runner       │  │ Storage    │  │
│  │  to server)   │  │              │  │ Tools      │  │
│  └──────────────┘  │  ┌────────┐  │  └────────────┘  │
│                     │  │Local:  │  │                   │
│                     │  │Agent   │  │                   │
│                     │  │SDK     │  │                   │
│                     │  ├────────┤  │                   │
│                     │  │Cloud:  │  │                   │
│                     │  │Generic │  │                   │
│                     │  │Agent   │  │                   │
│                     │  │Loop    │  │                   │
│                     │  └────────┘  │                   │
│                     └──────────────┘                   │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │ Local FS     │  │ electron-    │                   │
│  │ access       │  │ store        │                   │
│  │ (cwd, fs)    │  │ (settings)   │                   │
│  └──────────────┘  └──────────────┘                   │
└──────────────────────────────────────────────────────┘
```

### Session Modes

The desktop app supports ALL session modes — it's the union of CLI and web app capabilities:

| Mode | Workspace | Agent Execution | Tool Set |
|------|-----------|----------------|----------|
| **Local** | Local directory (cwd) | Claude Agent SDK (same as CLI) | Built-in Claude tools + MCP task source tools |
| **Cloud (GitHub/GitLab)** | GitHub repo or GitLab project | Generic agent loop (same as web app) | Web coding tools + task source tools |
| **Cloud (Storage)** | Google Drive or OneDrive folder | Generic agent loop (same as web app) | Storage tools + task source tools |

The key difference from the CLI: in **cloud mode**, the desktop app runs the generic agent loop in the main process (not the Claude Agent SDK subprocess), so it has full control over which tools are available — no built-in tools leak through.

### IPC Protocol

Communication between renderer and main process uses Electron's `ipcMain` / `ipcRenderer` via a preload bridge:

```typescript
// preload/index.ts
contextBridge.exposeInMainWorld("taskpilot", {
  // Auth
  login: (email: string, password: string) => ipcRenderer.invoke("auth:login", email, password),
  logout: () => ipcRenderer.invoke("auth:logout"),
  getSession: () => ipcRenderer.invoke("auth:session"),

  // Data
  getBoards: () => ipcRenderer.invoke("data:boards"),
  getBoardData: (boardId: string) => ipcRenderer.invoke("data:boardData", boardId),
  getGitHubRepos: () => ipcRenderer.invoke("data:githubRepos"),
  getGitLabProjects: () => ipcRenderer.invoke("data:gitlabProjects"),
  getIntegrationStatus: () => ipcRenderer.invoke("data:status"),

  // Sessions
  startSession: (config: SessionConfig) => ipcRenderer.invoke("session:start", config),
  stopSession: () => ipcRenderer.invoke("session:stop"),
  onSessionEvent: (callback: (event: SessionEvent) => void) =>
    ipcRenderer.on("session:event", (_e, event) => callback(event)),

  // Workspace
  selectDirectory: () => ipcRenderer.invoke("workspace:selectDirectory"), // native folder picker
  getGoogleFolders: (parentId: string) => ipcRenderer.invoke("workspace:googleFolders", parentId),
  getOneDriveFolders: (parentId: string) => ipcRenderer.invoke("workspace:onedriveFolders", parentId),

  // Settings
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (settings: Partial<Settings>) => ipcRenderer.invoke("settings:update", settings),
});
```

### Local Mode — Directory Picker

The desktop app adds a native directory picker (not a text input like the CLI):

```typescript
// main/ipc.ts
ipcMain.handle("workspace:selectDirectory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select project directory",
  });
  return result.filePaths[0] ?? null;
});
```

The renderer shows a "Browse..." button that opens the native OS folder picker. Selected path is displayed and used as `cwd` for the Claude Agent SDK session.

### Authentication

The desktop app authenticates against the deployed TaskPilot server (`account.task-pilot.dev`) — same as the CLI. It stores the session cookie locally using `electron-store` (encrypted at rest on disk).

Users can also connect to a self-hosted instance by changing the server URL in settings.

All data fetching (boards, repos, credentials) goes through the server API — the desktop app is a client, not a standalone server.

### Code Sharing Strategy

Many modules can be shared between the web app and desktop app:

| Module | Source | How to share |
|--------|--------|-------------|
| Google Drive client | `src/lib/google/client.ts` | Copy to `src/main/google/` (Node.js compatible) |
| OneDrive client | `src/lib/onedrive/client.ts` | Copy to `src/main/onedrive/` |
| Storage tools | `src/lib/providers/storage-tools.ts` | Copy to `src/main/providers/` |
| Types | `src/lib/types.ts` | Shared via package or copy |
| React components | `src/components/` | Copy to `src/renderer/components/` |
| Hooks | `src/hooks/` | Adapt: replace `fetch()` with IPC calls |

Long-term, these could be extracted into a shared `@taskpilot/core` package. For the initial build, copying is simpler.

### Build & Distribution

```bash
# Development
npm run dev              # Starts Electron with hot reload (electron-vite or similar)

# Build for current platform
npm run build            # Produces installer for current OS

# Build for all platforms
npm run build:win        # Windows .exe (NSIS installer)
npm run build:mac        # Mac .dmg
npm run build:linux      # Linux .AppImage + .deb

# Auto-update
# Publish to GitHub Releases → electron-updater checks for new versions on launch
```

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `electron` | Desktop shell |
| `electron-builder` or `@electron-forge/cli` | Build & packaging |
| `electron-store` | Encrypted local settings/cookie storage |
| `electron-updater` | Auto-update from GitHub Releases |
| `@anthropic-ai/claude-agent-sdk` | Local Claude sessions |
| `@anthropic-ai/sdk` | Generic agent loop (OpenAI/Groq too) |
| `react` + `react-dom` | Renderer UI |
| `@tanstack/react-query` | Data fetching in renderer |
| `tailwindcss` | Styling (same as web app) |
| `lucide-react` | Icons (same as web app) |

### Sub-phases

- **22a: Project scaffold** — Electron + Vite + React + TypeScript setup, window creation, menu bar, app icons
- **22b: Auth & data layer** — Login flow, session cookie storage, IPC handlers for boards/repos/status
- **22c: Local mode** — Directory picker, Claude Agent SDK session runner in main process, SSE-like event streaming via IPC
- **22d: UI port** — Copy and adapt React components from web app (SessionControls, SessionLog, BoardPanel, WorkspaceTypePicker, Sidebar)
- **22e: Cloud mode (repos)** — Generic agent loop in main process for GitHub/GitLab web mode, branch selection
- **22f: Cloud mode (storage)** — Storage tool set in main process for Google Drive/OneDrive workspaces, Google Docs support
- **22g: Settings** — electron-store based settings, server URL config, theme sync
- **22h: Multi-provider** — OpenAI and Groq support via generic agent loop in main process
- **22i: Session history** — Fetch and display session history from server API
- **22j: Build & packaging** — electron-builder config for Windows/Mac/Linux, installers, code signing
- **22k: Auto-update** — GitHub Releases + electron-updater for automatic updates
- **22l: Documentation** — Desktop app docs in web docs page, download links on frontend

---

## Useful References

- [TanStack Start Docs](https://tanstack.com/start/latest)
- [TanStack Router Docs](https://tanstack.com/router/latest)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Better Auth Docs](https://www.better-auth.com/docs)
- [Better Auth — Email & Password](https://www.better-auth.com/docs/authentication/email-password)
- [Better Auth — Generic OAuth (for Trello linking)](https://www.better-auth.com/docs/authentication/generic-oauth)
- [Better Auth — Account Linking](https://www.better-auth.com/docs/concepts/account-linking)
- [Better Auth — Drizzle Adapter](https://www.better-auth.com/docs/adapters/drizzle)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Drizzle — Turso / libSQL](https://orm.drizzle.team/docs/get-started/turso-new)
- [Turso Docs](https://docs.turso.tech)
- [Turso CLI](https://docs.turso.tech/cli/introduction)
- [Trello REST API Docs](https://developer.atlassian.com/cloud/trello/rest/)
- [Trello OAuth 1.0a Guide](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)
- [Google Drive API v3](https://developers.google.com/drive/api/reference/rest/v3)
- [Google Sheets API v4](https://developers.google.com/sheets/api/reference/rest)
- [Google OAuth 2.0 for Web Server Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Microsoft Graph API — OneDrive](https://learn.microsoft.com/en-us/graph/api/resources/onedrive)
- [Microsoft Graph API — Excel Workbooks](https://learn.microsoft.com/en-us/graph/api/resources/excel)
- [Microsoft Identity Platform — OAuth 2.0](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Electron Docs](https://www.electronjs.org/docs/latest/)
- [Electron Forge](https://www.electronforge.io/)
- [Electron Builder](https://www.electron.build/)
- [electron-store](https://github.com/sindresorhus/electron-store)
- [electron-updater](https://www.electron.build/auto-update)
