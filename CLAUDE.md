# CLAUDE.md — Trello × Claude Code Bridge

> This file gives Claude Code full context about this project. Read it entirely before making any changes.

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

All phases are complete. See **PROGRESS.md** for detailed phase history and sub-phase checklists.

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

## Code Style & Conventions

- **TypeScript strict mode** is enabled. No `any`. Use `unknown` + type guards where needed.
- **No default exports** except for route files (TanStack Router convention).
- All API response types should be defined in `app/lib/types.ts`.
- Component files: PascalCase. Utility/hook files: camelCase.
- Keep components **presentation-only** — data fetching lives in hooks or loaders.
- All Trello mutations go through a `useMutation` with **optimistic updates** — the checkbox should toggle immediately, then reconcile with server state.
- Use `invariant` (from `@tanstack/react-router`) for runtime assertions in loaders.

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
