import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

// Better Auth manages these tables — export names must match BA model names
export const user = sqliteTable("user", {
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

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  idToken: text("idToken"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

// Our custom table — one row per user
// NOTE: encryptedAnthropicApiKey is deprecated — use provider_keys table instead.
// Kept for backward compat during migration.
export const userSettings = sqliteTable("user_settings", {
  userId: text("userId")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // DEPRECATED: Use provider_keys table. Kept for migration.
  encryptedAnthropicApiKey: text("encryptedAnthropicApiKey"),
  // Tracks when the user last viewed the Updates page (for unseen badge)
  lastSeenUpdateAt: integer("lastSeenUpdateAt", { mode: "timestamp" }),
  // Budget: monthly spending limit in USD cents (null = no limit)
  monthlyBudgetCents: integer("monthlyBudgetCents"),
  // Budget: alert threshold percentage (0-100, default 80)
  budgetAlertThreshold: integer("budgetAlertThreshold").default(80),
  // PR/MR automation config (JSON-serialized PrAutomationConfig)
  prAutomationConfig: text("prAutomationConfig"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

// ── Session History (Phase 15) ─────────────────────────────────────────────

export const agentSessions = sqliteTable("agent_session", {
  id: text("id").primaryKey(), // nanoid
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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
  // Metrics
  inputTokens: integer("inputTokens").notNull().default(0),
  outputTokens: integer("outputTokens").notNull().default(0),
  totalCostCents: integer("totalCostCents").notNull().default(0), // USD cents
  tasksTotal: integer("tasksTotal").notNull().default(0),
  tasksCompleted: integer("tasksCompleted").notNull().default(0),
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
  type: text("type").notNull(), // "assistant" | "tool_use" | "tool_result" | "task_completed" | "error" | "system" | "agent_started" | "agent_finished" | "merge_result" | "user" | "done"
  agentIndex: integer("agentIndex"), // for parallel sessions — which agent produced this
  cardId: text("cardId"), // task source card/issue ID this event relates to
  content: text("content").notNull(), // JSON-serialized event payload
  // Ordering
  sequence: integer("sequence").notNull(), // monotonically increasing per session
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
});

// ── Webhook Registration (Phase 20) ───────────────────────────────────────

export const registeredWebhooks = sqliteTable("registered_webhook", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  source: text("source").notNull(), // "trello" | "github" | "gitlab"
  sourceIdentifier: text("sourceIdentifier").notNull(), // boardId, "owner/repo", projectId
  webhookId: text("webhookId"), // ID returned by the source API
  secret: text("secret"), // webhook validation secret (encrypted)
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

// Multi-provider API key storage — one row per (user, provider)
// Encrypted with AES-256-GCM via encrypt.ts
// Format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
export const providerKeys = sqliteTable(
  "provider_keys",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: text("providerId").notNull(), // 'claude' | 'openai' | 'groq'
    encryptedApiKey: text("encryptedApiKey").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("provider_keys_user_provider_idx").on(
      table.userId,
      table.providerId,
    ),
  ],
);
