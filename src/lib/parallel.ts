import { randomBytes } from "crypto";
import { launchCardAgent } from "#/lib/claude";
import { getProvider } from "#/lib/providers";
import type { AiProviderId } from "#/lib/providers/types";
import {
  getCurrentBranch,
  getCurrentSha,
  createWorktree,
  removeWorktree,
  mergeWorktreeBranch,
  getDiffStats,
  createIntegrationBranch,
  deleteBranch,
} from "#/lib/git";
import type {
  BoardData,
  TrelloCard,
  AgentStatus,
  ParallelEvent,
  ParallelSessionSummary,
} from "#/lib/types";

export interface ParallelSessionParams {
  anthropicApiKey: string;
  trelloToken: string;
  boardData: BoardData;
  cwd: string;
  maxConcurrency: number;
  userMessage?: string;
  abortController?: AbortController;
  providerId?: AiProviderId;
  source?: "trello" | "github" | "gitlab";
  sourceToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  gitlabProjectId?: number;
}

export const MAX_COST_PER_AGENT_USD = 2;
const MAX_CONCURRENT_PROCESSES = 5;

/**
 * Launch parallel agents — one per card — with concurrency control.
 * Yields ParallelEvent as agents progress.
 */
export async function* launchParallelSession(
  params: ParallelSessionParams,
): AsyncGenerator<ParallelEvent> {
  const {
    anthropicApiKey,
    trelloToken,
    boardData,
    cwd,
    maxConcurrency,
    userMessage,
    abortController,
  } = params;

  const sessionId = randomBytes(4).toString("hex");
  const effectiveConcurrency = Math.min(
    maxConcurrency,
    MAX_CONCURRENT_PROCESSES,
  );

  // Filter to active cards only
  const activeCards = boardData.doneListId
    ? boardData.cards.filter((c) => c.idList !== boardData.doneListId)
    : boardData.cards;

  if (activeCards.length === 0) {
    return;
  }

  // Snapshot current git state
  const baseBranch = await getCurrentBranch(cwd);
  const baseSha = await getCurrentSha(cwd);

  // Track agent statuses
  const agentStatuses = new Map<string, AgentStatus>();
  const worktrees = new Map<string, string>(); // cardId -> worktreePath
  const branches = new Map<string, string>(); // cardId -> branchName

  // Queue all cards
  for (const card of activeCards) {
    const status: AgentStatus = {
      cardId: card.id,
      cardName: card.name,
      state: "queued",
      checklistTotal: card.checklists.reduce(
        (sum, cl) => sum + cl.checkItems.length,
        0,
      ),
      checklistDone: card.checklists.reduce(
        (sum, cl) =>
          sum + cl.checkItems.filter((i) => i.state === "complete").length,
        0,
      ),
    };
    agentStatuses.set(card.id, status);
    yield { type: "agent_queued", cardId: card.id, cardName: card.name };
  }

  const queue = [...activeCards];

  async function runAgent(card: TrelloCard): Promise<ParallelEvent[]> {
    const events: ParallelEvent[] = [];
    const branchName = `parallel/${sessionId}/${card.id.slice(-6)}`;
    branches.set(card.id, branchName);

    const startTime = Date.now();
    let worktreePath: string;

    try {
      // Create worktree
      worktreePath = await createWorktree(cwd, branchName);
      worktrees.set(card.id, worktreePath);

      const status = agentStatuses.get(card.id)!;
      status.state = "running";
      status.branch = branchName;
      status.worktreePath = worktreePath;

      events.push({
        type: "agent_started",
        cardId: card.id,
        branch: branchName,
        worktreePath,
      });

      // Launch the agent — use provider adapter if non-Claude, else direct SDK
      const agentCardParams = {
        apiKey: anthropicApiKey,
        trelloToken,
        card,
        boardId: boardData.board.id,
        boardName: boardData.board.name,
        cwd: worktreePath,
        userMessage,
        abortController,
      };

      const useProviderAdapter =
        params.providerId && params.providerId !== "claude";
      const agentSession = useProviderAdapter
        ? (await getProvider(params.providerId!)).launchCardAgent(agentCardParams)
        : launchCardAgent({
            anthropicApiKey,
            trelloToken,
            card,
            boardId: boardData.board.id,
            boardName: boardData.board.name,
            cwd: worktreePath,
            userMessage,
            abortController,
            source: params.source,
            sourceToken: params.sourceToken,
            githubOwner: params.githubOwner,
            githubRepo: params.githubRepo,
            gitlabProjectId: params.gitlabProjectId,
          });

      // Stream agent messages
      for await (const message of agentSession) {
        events.push({
          type: "agent_message",
          cardId: card.id,
          message,
        });
      }

      status.state = "completed";
      status.durationMs = Date.now() - startTime;

      events.push({
        type: "agent_completed",
        cardId: card.id,
        status: { ...status },
      });
    } catch (err) {
      const status = agentStatuses.get(card.id)!;
      status.state = "failed";
      status.error = err instanceof Error ? err.message : "Unknown error";
      status.durationMs = Date.now() - startTime;

      events.push({
        type: "agent_failed",
        cardId: card.id,
        error: status.error,
      });
    }

    return events;
  }

  // Run agents with concurrency control
  // We use a simple approach: process batches through a worker pool
  const results: ParallelEvent[][] = [];
  let queueIndex = 0;

  async function worker(): Promise<void> {
    while (queueIndex < queue.length) {
      if (abortController?.signal.aborted) return;
      const card = queue[queueIndex++];
      if (!card) return;
      const events = await runAgent(card);
      results.push(events);
    }
  }

  // Spawn workers up to concurrency limit
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(effectiveConcurrency, queue.length); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  // Yield all collected events
  for (const eventBatch of results) {
    for (const event of eventBatch) {
      yield event;
    }
  }

  // ── Merge phase ─────────────────────────────────────────────────────────
  // Create an integration branch and merge each agent's work
  const integrationBranch = await createIntegrationBranch(cwd, sessionId);
  const mergeConflicts: Array<{ cardId: string; files: string[] }> = [];

  for (const card of activeCards) {
    const branch = branches.get(card.id);
    const worktreePath = worktrees.get(card.id);
    const status = agentStatuses.get(card.id)!;

    if (!branch || status.state === "failed") continue;

    yield { type: "merge_started", cardId: card.id };
    status.state = "merging";

    const result = await mergeWorktreeBranch(cwd, branch, integrationBranch);

    if (result.success) {
      yield {
        type: "merge_completed",
        cardId: card.id,
        success: true,
      };
    } else {
      status.state = "conflict";
      mergeConflicts.push({ cardId: card.id, files: result.conflicts });
      yield {
        type: "merge_completed",
        cardId: card.id,
        success: false,
        conflicts: result.conflicts,
      };
    }

    // Clean up worktree
    if (worktreePath) {
      try {
        await removeWorktree(cwd, worktreePath);
      } catch {
        // Best effort cleanup
      }
    }

    // Delete agent branch
    try {
      await deleteBranch(cwd, branch);
    } catch {
      // Best effort cleanup
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const diffStats = await getDiffStats(cwd, baseSha, "HEAD");

  const summary: ParallelSessionSummary = {
    agents: Array.from(agentStatuses.values()),
    totalCostUsd: Array.from(agentStatuses.values()).reduce(
      (sum, a) => sum + (a.costUsd ?? 0),
      0,
    ),
    totalDurationMs: Array.from(agentStatuses.values()).reduce(
      (max, a) => Math.max(max, a.durationMs ?? 0),
      0,
    ),
    integrationBranch,
    mergeConflicts,
    diffStats,
  };

  yield { type: "summary", summary };

  // Return to original branch (leave integration branch available)
  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const exec = promisify(execFile);
    await exec("git", ["checkout", baseBranch], { cwd });
  } catch {
    // Best effort
  }
}
