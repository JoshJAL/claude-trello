import { randomUUID } from "crypto";
import { db } from "#/lib/db";
import { agentSessions, sessionEvents, userSettings } from "#/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import type { BoardData } from "#/lib/types";
import type { AiProviderId } from "#/lib/providers/types";
import { calculateCost, extractClaudeUsage } from "#/lib/providers/cost";

export interface CreateSessionParams {
  userId: string;
  source: "trello" | "github" | "gitlab";
  sourceIdentifier: string;
  sourceName: string;
  providerId: AiProviderId;
  mode: "sequential" | "parallel";
  maxConcurrency?: number;
  initialMessage?: string;
  boardData: BoardData;
}

/**
 * Buffers session events and flushes them to the database in batches.
 * Tracks sequence numbers and provides helpers to update session status.
 */
export class SessionWriter {
  readonly sessionId: string;
  private providerId: AiProviderId = "claude";
  private sequence = 0;
  private buffer: Array<typeof sessionEvents.$inferInsert> = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private tasksCompleted = 0;
  private inputTokens = 0;
  private outputTokens = 0;

  private static readonly FLUSH_INTERVAL_MS = 500;
  private static readonly FLUSH_BATCH_SIZE = 20;

  constructor(sessionId: string, providerId: AiProviderId = "claude") {
    this.sessionId = sessionId;
    this.providerId = providerId;
  }

  /**
   * Create a new agent_session row and return a SessionWriter for buffering events.
   */
  static async create(params: CreateSessionParams): Promise<SessionWriter> {
    const id = randomUUID();
    const now = new Date();

    // Count total tasks from board data
    const tasksTotal = params.boardData.cards.reduce((sum, card) => {
      return sum + card.checklists.reduce((clSum, cl) => {
        return clSum + cl.checkItems.filter((item) => item.state !== "complete").length;
      }, 0);
    }, 0);

    await db.insert(agentSessions).values({
      id,
      userId: params.userId,
      source: params.source,
      sourceIdentifier: params.sourceIdentifier,
      sourceName: params.sourceName,
      providerId: params.providerId,
      mode: params.mode,
      maxConcurrency: params.maxConcurrency ?? null,
      initialMessage: params.initialMessage ?? null,
      status: "running",
      inputTokens: 0,
      outputTokens: 0,
      totalCostCents: 0,
      tasksTotal,
      tasksCompleted: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const writer = new SessionWriter(id, params.providerId);
    return writer;
  }

  /**
   * Buffer an event for later flush. Flushes automatically when the buffer
   * reaches FLUSH_BATCH_SIZE or after FLUSH_INTERVAL_MS.
   */
  addEvent(
    type: string,
    content: Record<string, unknown>,
    opts?: { agentIndex?: number; cardId?: string },
  ): void {
    const event: typeof sessionEvents.$inferInsert = {
      id: randomUUID(),
      sessionId: this.sessionId,
      type,
      agentIndex: opts?.agentIndex ?? null,
      cardId: opts?.cardId ?? null,
      content: JSON.stringify(content),
      sequence: this.sequence++,
      timestamp: new Date(),
    };

    this.buffer.push(event);

    // Track task completions
    if (type === "task_completed") {
      this.tasksCompleted++;
    }

    if (this.buffer.length >= SessionWriter.FLUSH_BATCH_SIZE) {
      void this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(
        () => void this.flush(),
        SessionWriter.FLUSH_INTERVAL_MS,
      );
    }
  }

  /**
   * Record an SSE message as a session event. Extracts the event type
   * from the message and stores the full message as content.
   */
  recordMessage(message: Record<string, unknown>, opts?: { agentIndex?: number; cardId?: string }): void {
    const type = (message.type as string) ?? "unknown";

    // Detect task completion events from various sources
    const isTaskCompleted =
      type === "tool_result" &&
      typeof message.toolName === "string" &&
      (message.toolName === "check_trello_item" ||
        message.toolName === "check_github_task" ||
        message.toolName === "check_gitlab_task");

    // Extract token usage from messages
    // Claude: usage appears in "result" messages via the raw field
    if (message.raw) {
      const claudeUsage = extractClaudeUsage(message.raw);
      if (claudeUsage) {
        this.inputTokens = claudeUsage.inputTokens;
        this.outputTokens = claudeUsage.outputTokens;
      }
    }
    // OpenAI/Groq: usage appears on the "done" message from generic agent loop
    if (message.usage && typeof message.usage === "object") {
      const usage = message.usage as { inputTokens?: number; outputTokens?: number };
      if (usage.inputTokens !== undefined) {
        this.inputTokens = usage.inputTokens;
      }
      if (usage.outputTokens !== undefined) {
        this.outputTokens = usage.outputTokens;
      }
    }

    this.addEvent(
      isTaskCompleted ? "task_completed" : type,
      message,
      opts,
    );
  }

  /**
   * Flush all buffered events to the database.
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0);
    try {
      await db.insert(sessionEvents).values(batch);
    } catch (err) {
      // Re-add failed events to the front of the buffer for retry
      this.buffer.unshift(...batch);
      console.error("[SessionWriter] Failed to flush events:", err);
    }
  }

  /**
   * Mark the session as completed, flush remaining events, and update metrics.
   */
  private getMetrics() {
    const cost = calculateCost(this.providerId, {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    });
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalCostCents: cost.totalCostCents,
      tasksCompleted: this.tasksCompleted,
    };
  }

  async complete(): Promise<void> {
    await this.flush();
    const now = new Date();
    await db
      .update(agentSessions)
      .set({
        status: "completed",
        completedAt: now,
        ...this.getMetrics(),
        updatedAt: now,
      })
      .where(eq(agentSessions.id, this.sessionId));
  }

  /**
   * Mark the session as failed with an error message.
   */
  async fail(errorMessage: string): Promise<void> {
    await this.flush();
    const now = new Date();
    await db
      .update(agentSessions)
      .set({
        status: "failed",
        errorMessage,
        completedAt: now,
        ...this.getMetrics(),
        updatedAt: now,
      })
      .where(eq(agentSessions.id, this.sessionId));
  }

  /**
   * Mark the session as cancelled (e.g. client disconnected).
   */
  async cancel(): Promise<void> {
    await this.flush();
    const now = new Date();
    await db
      .update(agentSessions)
      .set({
        status: "cancelled",
        completedAt: now,
        ...this.getMetrics(),
        updatedAt: now,
      })
      .where(eq(agentSessions.id, this.sessionId));
  }
}

// ── Budget Check ──────────────────────────────────────────────────────────────

export interface BudgetCheckResult {
  allowed: boolean;
  /** Current month spend in cents */
  spentCents: number;
  /** Monthly budget in cents (null = no limit) */
  budgetCents: number | null;
  /** Alert threshold percentage */
  alertThreshold: number;
  /** Whether the user is at or above the alert threshold */
  warning: boolean;
}

/**
 * Check if a user's monthly spending is within their budget.
 * Returns whether the session should be allowed and any warnings.
 */
export async function checkBudget(userId: string): Promise<BudgetCheckResult> {
  // Get user's budget settings
  const [settings] = await db
    .select({
      monthlyBudgetCents: userSettings.monthlyBudgetCents,
      budgetAlertThreshold: userSettings.budgetAlertThreshold,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const budgetCents = settings?.monthlyBudgetCents ?? null;
  const alertThreshold = settings?.budgetAlertThreshold ?? 80;

  // No budget set — always allowed, no warning
  if (budgetCents === null) {
    return { allowed: true, spentCents: 0, budgetCents: null, alertThreshold, warning: false };
  }

  // Calculate current month spend
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [result] = await db
    .select({ total: sql<number>`coalesce(sum(${agentSessions.totalCostCents}), 0)` })
    .from(agentSessions)
    .where(
      and(
        eq(agentSessions.userId, userId),
        gte(agentSessions.startedAt, monthStart),
      ),
    );

  const spentCents = result?.total ?? 0;
  const allowed = spentCents < budgetCents;
  const warning = spentCents >= (budgetCents * alertThreshold) / 100;

  return { allowed, spentCents, budgetCents, alertThreshold, warning };
}
