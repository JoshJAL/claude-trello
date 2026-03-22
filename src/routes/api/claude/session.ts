import { createFileRoute } from "@tanstack/react-router";
import { existsSync, statSync } from "fs";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db";
import { account, providerKeys, userSettings } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "#/lib/encrypt";
import { launchParallelSession } from "#/lib/parallel";
import { getProvider } from "#/lib/providers";
import type { SessionMode, WebModeConfig } from "#/lib/providers";
import type { AiProviderId } from "#/lib/providers/types";
import type { ToolSet } from "#/lib/providers/source-tools";
import { createWebToolSet } from "#/lib/providers/web-tools";
import type { WebToolContext } from "#/lib/providers/web-tools";
import {
  createTrelloToolSet,
  createGitHubSourceToolSet,
  createGitLabSourceToolSet,
  createGuardedToolSet,
} from "#/lib/providers/source-tools";
import {
  WEB_GITHUB_SYSTEM_PROMPT,
  WEB_GITLAB_SYSTEM_PROMPT,
  WEB_TRELLO_ADVISORY_PROMPT,
  WEB_TRELLO_REPO_SYSTEM_PROMPT,
} from "#/lib/providers/prompts";
import { buildUserPrompt } from "#/lib/prompts";
import type { BoardData } from "#/lib/types";
import { SessionWriter, checkBudget } from "#/lib/session-history";
import { DEFAULT_PR_AUTOMATION_CONFIG } from "#/lib/types";
import { ensureWebhookRegistered } from "#/lib/webhooks/registration";
import { getValidGitLabToken } from "#/lib/gitlab/token";
import {
  createPr,
  generatePrBody,
  generateBranchName,
  countTasks,
  extractIssueNumbers,
  attachPrToTrelloCard,
  parsePrAutomationConfig,
} from "#/lib/pr";

/** Minimal shape of a Claude Agent SDK Query — avoids importing the SDK at module level */
interface StreamableQuery {
  streamInput(input: AsyncIterable<unknown>): Promise<void>;
  close(): void;
}

interface ActiveSession {
  query?: StreamableQuery;
  abortController: AbortController;
  mode: "sequential" | "parallel";
}

// Track active sessions per user to enforce one-at-a-time
const activeSessions = new Map<string, ActiveSession>();

export const Route = createFileRoute("/api/claude/session")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Rate limit: one active session per user
        if (activeSessions.has(userId)) {
          return Response.json(
            { error: "A session is already active" },
            { status: 429 },
          );
        }

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { error: "Invalid JSON body" },
            { status: 400 },
          );
        }

        const boardData = body.boardData as BoardData;
        const cwd = body.cwd as string | undefined;
        const userMessage = body.userMessage as string | undefined;
        const providerId =
          (body.providerId as AiProviderId | undefined) ?? "claude";
        const source =
          (body.source as "trello" | "github" | "gitlab" | undefined) ?? "trello";
        const mode =
          (body.mode as "sequential" | "parallel" | undefined) ?? "sequential";
        const maxConcurrency = Math.min(
          Math.max(1, (body.maxConcurrency as number) || 3),
          5,
        );
        const webMode = body.webMode as boolean | undefined;

        // GitHub-specific params
        const githubOwner = body.githubOwner as string | undefined;
        const githubRepo = body.githubRepo as string | undefined;

        // GitLab-specific params
        const gitlabProjectId = body.gitlabProjectId as number | undefined;

        // PR automation override from CLI: true = force PR, false = skip PR, undefined = use config
        const prOverride = body.pr as boolean | undefined;

        if (!boardData?.board?.id || !boardData?.cards) {
          return Response.json(
            { error: "boardData is required" },
            { status: 400 },
          );
        }

        // Determine session mode: web or local
        // Deployed instances ALWAYS use web mode — local filesystem doesn't exist
        const isLocal =
          request.headers.get("host")?.startsWith("localhost") ||
          request.headers.get("host")?.startsWith("127.0.0.1");
        const sessionMode: SessionMode =
          !isLocal ? "web" : (webMode ? "web" : "local");

        // Validate cwd for local mode
        if (sessionMode === "local") {
          if (!cwd || !cwd.startsWith("/")) {
            return Response.json(
              { error: "cwd must be an absolute path" },
              { status: 400 },
            );
          }

          if (isLocal) {
            try {
              if (!existsSync(cwd) || !statSync(cwd).isDirectory()) {
                return Response.json(
                  { error: "cwd is not a valid directory" },
                  { status: 400 },
                );
              }
            } catch {
              return Response.json(
                { error: "cwd is not accessible" },
                { status: 400 },
              );
            }
          }
        }

        // Get task source token(s)
        let trelloToken = "";
        let sourceToken = "";

        if (source === "github") {
          if (!githubOwner || !githubRepo) {
            return Response.json(
              { error: "githubOwner and githubRepo are required for GitHub source" },
              { status: 400 },
            );
          }

          const [githubAccount] = await db
            .select({ accessToken: account.accessToken })
            .from(account)
            .where(
              and(
                eq(account.userId, userId),
                eq(account.providerId, "github"),
              ),
            )
            .limit(1);

          if (!githubAccount?.accessToken) {
            return Response.json(
              { error: "GitHub not connected" },
              { status: 400 },
            );
          }
          sourceToken = githubAccount.accessToken;
        } else if (source === "gitlab") {
          if (!gitlabProjectId) {
            return Response.json(
              { error: "gitlabProjectId is required for GitLab source" },
              { status: 400 },
            );
          }

          const gitlabToken = await getValidGitLabToken(userId);
          if (!gitlabToken) {
            return Response.json(
              { error: "GitLab not connected" },
              { status: 400 },
            );
          }
          sourceToken = gitlabToken;
        } else {
          const [trelloAccount] = await db
            .select({ accessToken: account.accessToken })
            .from(account)
            .where(
              and(
                eq(account.userId, userId),
                eq(account.providerId, "trello"),
              ),
            )
            .limit(1);

          if (!trelloAccount?.accessToken) {
            return Response.json(
              { error: "Trello not connected" },
              { status: 400 },
            );
          }
          trelloToken = trelloAccount.accessToken;
          sourceToken = trelloAccount.accessToken;

          // If a GitHub repo is linked to this Trello board, also fetch GitHub token
          if (githubOwner && githubRepo) {
            const [githubAccount] = await db
              .select({ accessToken: account.accessToken })
              .from(account)
              .where(
                and(
                  eq(account.userId, userId),
                  eq(account.providerId, "github"),
                ),
              )
              .limit(1);

            if (githubAccount?.accessToken) {
              sourceToken = githubAccount.accessToken;
            }
          }

          // If a GitLab project is linked to this Trello board, also fetch GitLab token
          if (gitlabProjectId && !githubOwner) {
            const gitlabToken = await getValidGitLabToken(userId);
            if (gitlabToken) {
              sourceToken = gitlabToken;
            }
          }
        }

        // Get and decrypt AI provider API key
        let encryptedKey: string | null = null;

        // Check provider_keys table first
        const [providerKey] = await db
          .select({ encryptedApiKey: providerKeys.encryptedApiKey })
          .from(providerKeys)
          .where(
            and(
              eq(providerKeys.userId, userId),
              eq(providerKeys.providerId, providerId),
            ),
          )
          .limit(1);

        if (providerKey) {
          encryptedKey = providerKey.encryptedApiKey;
        }

        // Fallback to legacy userSettings for Claude
        if (!encryptedKey && providerId === "claude") {
          const [settings] = await db
            .select({
              encryptedAnthropicApiKey: userSettings.encryptedAnthropicApiKey,
            })
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);
          encryptedKey = settings?.encryptedAnthropicApiKey ?? null;
        }

        if (!encryptedKey) {
          return Response.json(
            { error: `${providerId} API key not configured` },
            { status: 400 },
          );
        }

        let apiKey: string;
        try {
          apiKey = decrypt(encryptedKey);
        } catch {
          return Response.json(
            { error: "API key is corrupted. Please re-enter it in Settings." },
            { status: 400 },
          );
        }

        const anthropicApiKey = apiKey;

        // ── Budget check ──────────────────────────────────────────────────
        const budget = await checkBudget(userId);
        if (!budget.allowed) {
          const limitStr = `$${((budget.budgetCents ?? 0) / 100).toFixed(2)}`;
          return Response.json(
            { error: `Monthly budget of ${limitStr} reached. Update your budget in Settings.` },
            { status: 429 },
          );
        }

        // Source metadata passed to session launchers
        const sourceParams = { source, sourceToken, githubOwner, githubRepo, gitlabProjectId };

        const abortController = new AbortController();

        // ── Create persistent session record ──────────────────────────────
        let sourceIdentifier: string;
        if (source === "github" && githubOwner && githubRepo) {
          sourceIdentifier = `${githubOwner}/${githubRepo}`;
        } else if (source === "gitlab" && gitlabProjectId) {
          sourceIdentifier = String(gitlabProjectId);
        } else {
          sourceIdentifier = boardData.board.id;
        }

        const sessionWriter = await SessionWriter.create({
          userId,
          source,
          sourceIdentifier,
          sourceName: boardData.board.name,
          providerId,
          mode,
          maxConcurrency: mode === "parallel" ? maxConcurrency : undefined,
          initialMessage: userMessage,
          boardData,
        });

        // Auto-register webhook for this source (best-effort, non-blocking)
        void ensureWebhookRegistered(userId, source, sourceIdentifier, sourceToken);

        // Emit budget warning if near threshold
        if (budget.warning && budget.budgetCents !== null) {
          const spentStr = `$${(budget.spentCents / 100).toFixed(2)}`;
          const limitStr = `$${(budget.budgetCents / 100).toFixed(2)}`;
          sessionWriter.addEvent("system", {
            type: "system",
            content: `Budget warning: You've spent ${spentStr} of your ${limitStr} monthly limit.`,
          });
        }

        // Abort the session if the client disconnects
        request.signal.addEventListener("abort", () => {
          abortController.abort();
          activeSessions.delete(userId);
          void sessionWriter.cancel();
        });

        // ── Web mode ──────────────────────────────────────────────────────
        if (sessionMode === "web") {
          // Use first card/issue title for branch naming
          const firstIssueTitle = boardData.cards[0]?.name;
          const webConfig = buildWebConfig(source, sourceToken, {
            githubOwner,
            githubRepo,
            gitlabProjectId,
            trelloToken,
            boardId: boardData.board.id,
            issueTitle: firstIssueTitle,
            providerName: providerId,
          });

          const provider = await getProvider(providerId, "web", webConfig);

          const providerSession = provider.launchSession({
            apiKey: anthropicApiKey,
            trelloToken,
            boardData,
            cwd: "",
            userMessage,
            abortController,
          });

          activeSessions.set(userId, { abortController, mode: "sequential" });

          const stream = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();

              try {
                for await (const message of providerSession) {
                  sessionWriter.recordMessage(message as unknown as Record<string, unknown>);
                  const data = JSON.stringify(message);
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }

                // Attempt PR creation
                const prEvent = await attemptPrCreation({
                  userId, source, sourceToken, boardData, providerId,
                  mode: "sequential", startTime: Date.now(), prOverride,
                  githubOwner, githubRepo, gitlabProjectId,
                  trelloToken: trelloToken || undefined,
                });
                if (prEvent) {
                  sessionWriter.recordMessage(prEvent as unknown as Record<string, unknown>);
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(prEvent)}\n\n`),
                  );
                }

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "done" })}\n\n`,
                  ),
                );
                await sessionWriter.complete();
              } catch (err) {
                const errorMsg =
                  err instanceof Error ? err.message : "Unknown error";
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`,
                  ),
                );
                await sessionWriter.fail(errorMsg);
              } finally {
                activeSessions.delete(userId);
                controller.close();
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "X-Session-Id": sessionWriter.sessionId,
            },
          });
        }

        // ── Local mode ────────────────────────────────────────────────────

        if (mode === "parallel") {
          // ── Parallel mode ───────────────────────────────────────────────
          activeSessions.set(userId, { abortController, mode: "parallel" });

          const stream = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();
              let integrationBranch: string | undefined;

              try {
                const parallelSession = launchParallelSession({
                  anthropicApiKey,
                  trelloToken,
                  boardData,
                  cwd: cwd!,
                  maxConcurrency,
                  userMessage,
                  abortController,
                  providerId,
                  ...sourceParams,
                });

                for await (const event of parallelSession) {
                  // Extract agent index and card ID for parallel event tracking
                  const parallelEvent = event as Record<string, unknown>;
                  const cardId = parallelEvent.cardId as string | undefined;
                  sessionWriter.recordMessage(parallelEvent, { cardId });
                  const data = JSON.stringify(event);
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  // Capture integration branch from summary
                  if ((event as { type: string }).type === "summary") {
                    integrationBranch = (event as { summary?: { integrationBranch?: string } }).summary?.integrationBranch;
                  }
                }

                // Attempt PR creation
                const prEvent = await attemptPrCreation({
                  userId, source, sourceToken, boardData, providerId,
                  mode: "parallel", startTime: Date.now(), prOverride,
                  githubOwner, githubRepo, gitlabProjectId,
                  trelloToken: trelloToken || undefined,
                  branch: integrationBranch,
                });
                if (prEvent) {
                  sessionWriter.recordMessage(prEvent as unknown as Record<string, unknown>);
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(prEvent)}\n\n`),
                  );
                }

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "done" })}\n\n`,
                  ),
                );
                await sessionWriter.complete();
              } catch (err) {
                const errorMsg =
                  err instanceof Error ? err.message : "Unknown error";
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`,
                  ),
                );
                await sessionWriter.fail(errorMsg);
              } finally {
                activeSessions.delete(userId);
                controller.close();
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "X-Session-Id": sessionWriter.sessionId,
            },
          });
        }

        // ── Sequential mode ──────────────────────────────────────────────
        // Use the provider adapter for all providers (Claude uses Agent SDK,
        // OpenAI/Groq use the generic agent loop with function calling)
        const provider = await getProvider(providerId, "local");
        const providerSession = provider.launchSession({
          apiKey: anthropicApiKey,
          trelloToken,
          boardData,
          cwd: cwd!,
          userMessage,
          abortController,
          sourceContext: {
            source,
            sourceToken,
            githubOwner,
            githubRepo,
            gitlabProjectId,
          },
        });

        activeSessions.set(userId, {
          abortController,
          mode: "sequential",
          // Only Claude's Agent SDK supports streamInput for interactive Q&A
          query: providerId === "claude"
            ? (providerSession as unknown as StreamableQuery)
            : undefined,
        });

        // Stream SSE response
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();

            try {
              for await (const message of providerSession) {
                sessionWriter.recordMessage(message as unknown as Record<string, unknown>);
                const data = JSON.stringify(message);
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }

              // Attempt PR creation
              const prEvent = await attemptPrCreation({
                userId, source, sourceToken, boardData, providerId,
                mode: "sequential", startTime: Date.now(), prOverride,
                githubOwner, githubRepo, gitlabProjectId,
                trelloToken: trelloToken || undefined,
              });
              if (prEvent) {
                sessionWriter.recordMessage(prEvent as unknown as Record<string, unknown>);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(prEvent)}\n\n`),
                );
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "done" })}\n\n`,
                ),
              );
              await sessionWriter.complete();
            } catch (err) {
              const errorMsg =
                err instanceof Error ? err.message : "Unknown error";
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`,
                ),
              );
              await sessionWriter.fail(errorMsg);
            } finally {
              activeSessions.delete(userId);
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Session-Id": sessionWriter.sessionId,
          },
        });
      },

      // Send user input to an active session (sequential only)
      PATCH: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const active = activeSessions.get(session.user.id);
        if (!active || !active.query) {
          return Response.json(
            { error: "No active sequential session" },
            { status: 404 },
          );
        }

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { error: "Invalid JSON body" },
            { status: 400 },
          );
        }

        const message = body.message as string;
        if (!message) {
          return Response.json(
            { error: "message is required" },
            { status: 400 },
          );
        }

        // Feed user input into the running query
        async function* userInput() {
          yield {
            type: "user" as const,
            message: {
              role: "user" as const,
              content: message,
            },
            parent_tool_use_id: null,
            session_id: "",
          };
        }

        await active.query.streamInput(userInput());

        return Response.json({ success: true });
      },

      DELETE: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const active = activeSessions.get(session.user.id);
        if (active) {
          if (active.query) active.query.close();
          active.abortController.abort();
          activeSessions.delete(session.user.id);
        }

        return Response.json({ success: true });
      },
    },
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────

function buildWebConfig(
  source: "trello" | "github" | "gitlab",
  sourceToken: string,
  opts: {
    githubOwner?: string;
    githubRepo?: string;
    gitlabProjectId?: number;
    trelloToken: string;
    boardId: string;
    issueTitle?: string;
    providerName?: string;
  },
): WebModeConfig {
  // Build the combined tool set: web coding tools + source task tools
  if (source === "github" && opts.githubOwner && opts.githubRepo) {
    const ctx: WebToolContext = {
      source: "github",
      sourceToken,
      githubOwner: opts.githubOwner,
      githubRepo: opts.githubRepo,
      fileShas: new Map(),
      issueTitle: opts.issueTitle,
      providerName: opts.providerName,
    };
    const webTools = createWebToolSet(ctx);
    const sourceTools = createGitHubSourceToolSet(
      sourceToken,
      opts.githubOwner,
      opts.githubRepo,
    );
    return {
      systemPrompt: WEB_GITHUB_SYSTEM_PROMPT,
      toolSet: createGuardedToolSet(mergeToolSets(webTools, sourceTools)),
      buildUserPrompt: buildGitHubWebPrompt,
    };
  }

  if (source === "gitlab" && opts.gitlabProjectId) {
    const ctx: WebToolContext = {
      source: "gitlab",
      sourceToken,
      gitlabProjectId: opts.gitlabProjectId,
      fileShas: new Map(),
      issueTitle: opts.issueTitle,
      providerName: opts.providerName,
    };
    const webTools = createWebToolSet(ctx);
    const sourceTools = createGitLabSourceToolSet(
      sourceToken,
      opts.gitlabProjectId,
    );
    return {
      systemPrompt: WEB_GITLAB_SYSTEM_PROMPT,
      toolSet: createGuardedToolSet(mergeToolSets(webTools, sourceTools)),
      buildUserPrompt: buildGitLabWebPrompt,
    };
  }

  // Trello + linked GitHub repo: full file editing via GitHub API + Trello task tools
  if (opts.githubOwner && opts.githubRepo && sourceToken) {
    const ctx: WebToolContext = {
      source: "github",
      sourceToken,
      githubOwner: opts.githubOwner,
      githubRepo: opts.githubRepo,
      fileShas: new Map(),
      issueTitle: opts.issueTitle,
      providerName: opts.providerName,
    };
    const webTools = createWebToolSet(ctx);
    const trelloTools = createTrelloToolSet(opts.trelloToken, opts.boardId);
    return {
      systemPrompt: WEB_TRELLO_REPO_SYSTEM_PROMPT,
      toolSet: createGuardedToolSet(mergeToolSets(webTools, trelloTools)),
      buildUserPrompt: buildTrelloWebPrompt,
    };
  }

  // Trello + linked GitLab project: full file editing via GitLab API + Trello task tools
  if (opts.gitlabProjectId && sourceToken) {
    const ctx: WebToolContext = {
      source: "gitlab",
      sourceToken,
      gitlabProjectId: opts.gitlabProjectId,
      fileShas: new Map(),
      issueTitle: opts.issueTitle,
      providerName: opts.providerName,
    };
    const webTools = createWebToolSet(ctx);
    const trelloTools = createTrelloToolSet(opts.trelloToken, opts.boardId);
    return {
      systemPrompt: WEB_TRELLO_REPO_SYSTEM_PROMPT.replace("GitHub", "GitLab").replace("GitHub API", "GitLab API"),
      toolSet: createGuardedToolSet(mergeToolSets(webTools, trelloTools)),
      buildUserPrompt: buildTrelloWebPrompt,
    };
  }

  // Trello web mode without repo: advisory only (task tools but no file ops)
  const trelloTools = createTrelloToolSet(opts.trelloToken, opts.boardId);
  return {
    systemPrompt: WEB_TRELLO_ADVISORY_PROMPT,
    toolSet: trelloTools,
    buildUserPrompt: buildTrelloWebPrompt,
  };
}

/**
 * Source-aware user prompt builders for web mode.
 * These translate BoardData (which uses Trello terminology) into
 * the correct format for each source, and filter out completed tasks.
 */

function buildGitHubWebPrompt(boardData: BoardData, userMessage?: string): string {
  const issues = boardData.cards
    .map((card) => {
      const incompleteTasks = (card.checklists?.[0]?.checkItems ?? [])
        .filter((item) => item.state !== "complete")
        .map((item) => ({
          index: Number(item.id.replace("task-", "")),
          text: item.name,
        }));

      // Skip issues with no remaining tasks
      if (incompleteTasks.length === 0) return null;

      return {
        number: Number(card.id),
        title: card.name,
        body: card.desc,
        tasks: incompleteTasks,
      };
    })
    .filter(Boolean);

  const data = { repo: boardData.board.name, issues };

  let prompt = `Here are the GitHub issues with incomplete tasks to complete:\n\n${JSON.stringify(data, null, 2)}`;
  prompt += `\n\nEach task has an "index" field — use this as the taskIndex when calling check_github_task.`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}

function buildGitLabWebPrompt(boardData: BoardData, userMessage?: string): string {
  const issues = boardData.cards
    .map((card) => {
      const incompleteTasks = (card.checklists?.[0]?.checkItems ?? [])
        .filter((item) => item.state !== "complete")
        .map((item) => ({
          index: Number(item.id.replace("task-", "")),
          text: item.name,
        }));

      if (incompleteTasks.length === 0) return null;

      return {
        iid: Number(card.id),
        title: card.name,
        description: card.desc,
        tasks: incompleteTasks,
      };
    })
    .filter(Boolean);

  const data = { project: boardData.board.name, issues };

  let prompt = `Here are the GitLab issues with incomplete tasks to complete:\n\n${JSON.stringify(data, null, 2)}`;
  prompt += `\n\nEach task has an "index" field — use this as the taskIndex when calling check_gitlab_task.`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}

function buildTrelloWebPrompt(boardData: BoardData, userMessage?: string): string {
  // Filter out completed checklist items for Trello too
  const filtered: BoardData = {
    ...boardData,
    cards: boardData.cards
      .map((card) => ({
        ...card,
        checklists: card.checklists?.map((cl) => ({
          ...cl,
          checkItems: cl.checkItems.filter((item) => item.state !== "complete"),
        })).filter((cl) => cl.checkItems.length > 0),
      }))
      .filter((card) => (card.checklists?.length ?? 0) > 0),
  };
  return buildUserPrompt(filtered, userMessage);
}

function mergeToolSets(a: ToolSet, b: ToolSet): ToolSet {
  return {
    definitions: [...a.definitions, ...b.definitions],
    execute: async (name: string, input: Record<string, unknown>) => {
      // Route to the correct tool set based on which has the definition
      const inA = a.definitions.some((d) => d.name === name);
      if (inA) return a.execute(name, input);
      return b.execute(name, input);
    },
  };
}

// ── PR Automation ──────────────────────────────────────────────────────────

interface PrAutomationContext {
  userId: string;
  source: "trello" | "github" | "gitlab";
  sourceToken: string;
  boardData: BoardData;
  providerId: AiProviderId;
  mode: "sequential" | "parallel";
  startTime: number;
  prOverride?: boolean;
  githubOwner?: string;
  githubRepo?: string;
  gitlabProjectId?: number;
  trelloToken?: string;
  branch?: string;
}

/**
 * Attempt to create a PR/MR after session completion.
 * Returns a pr_created event object, or null if skipped/failed.
 * Best-effort: errors are logged but never thrown.
 */
async function attemptPrCreation(
  ctx: PrAutomationContext,
): Promise<{ type: string; url: string; number: number; title: string; draft: boolean } | null> {
  try {
    const [settings] = await db
      .select({ prAutomationConfig: userSettings.prAutomationConfig })
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.userId))
      .limit(1);

    const config = parsePrAutomationConfig(settings?.prAutomationConfig ?? null)
      ?? { ...DEFAULT_PR_AUTOMATION_CONFIG };

    const shouldCreate =
      ctx.prOverride === true || (ctx.prOverride !== false && config.enabled);

    if (!shouldCreate) return null;

    let prSource: "github" | "gitlab";
    let prOwner: string | undefined;
    let prRepo: string | undefined;
    let prProjectId: number | undefined;
    let prToken: string;

    if (ctx.source === "github" && ctx.githubOwner && ctx.githubRepo) {
      prSource = "github";
      prOwner = ctx.githubOwner;
      prRepo = ctx.githubRepo;
      prToken = ctx.sourceToken;
    } else if (ctx.source === "gitlab" && ctx.gitlabProjectId) {
      prSource = "gitlab";
      prProjectId = ctx.gitlabProjectId;
      prToken = ctx.sourceToken;
    } else if (ctx.source === "trello") {
      if (ctx.githubOwner && ctx.githubRepo) {
        const [ghAccount] = await db
          .select({ accessToken: account.accessToken })
          .from(account)
          .where(and(eq(account.userId, ctx.userId), eq(account.providerId, "github")))
          .limit(1);
        if (!ghAccount?.accessToken) return null;
        prSource = "github";
        prOwner = ctx.githubOwner;
        prRepo = ctx.githubRepo;
        prToken = ghAccount.accessToken;
      } else if (ctx.gitlabProjectId) {
        const [glAccount] = await db
          .select({ accessToken: account.accessToken })
          .from(account)
          .where(and(eq(account.userId, ctx.userId), eq(account.providerId, "gitlab")))
          .limit(1);
        if (!glAccount?.accessToken) return null;
        prSource = "gitlab";
        prProjectId = ctx.gitlabProjectId;
        prToken = glAccount.accessToken;
      } else {
        return null;
      }
    } else {
      return null;
    }

    const { completed, total } = countTasks(ctx.boardData);
    const durationMs = Date.now() - ctx.startTime;
    const issueNumbers = extractIssueNumbers(ctx.boardData);
    const providerLabel = ctx.providerId === "claude" ? "Claude" : ctx.providerId === "openai" ? "OpenAI" : "Groq";
    const firstCardTitle = ctx.boardData.cards[0]?.name ?? "tasks";

    const branch = ctx.branch ?? generateBranchName(
      config.branchNamingPattern, ctx.source, ctx.boardData.board.id, firstCardTitle,
    );

    const prTitle = `[TaskPilot] ${firstCardTitle}${ctx.boardData.cards.length > 1 ? ` (+${ctx.boardData.cards.length - 1} more)` : ""}`;

    const prBody = generatePrBody({
      source: ctx.source,
      boardName: ctx.boardData.board.name,
      tasksCompleted: completed,
      tasksTotal: total,
      providerName: providerLabel,
      mode: ctx.mode,
      durationMs,
      issueNumbers: prSource === "github" ? issueNumbers : undefined,
      autoLinkIssue: config.autoLinkIssue,
    });

    const pr = await createPr({
      source: prSource, sourceToken: prToken,
      owner: prOwner, repo: prRepo, projectId: prProjectId,
      title: prTitle, body: prBody, head: branch, base: "main",
      draft: config.autoDraft,
    });

    if (ctx.source === "trello" && ctx.trelloToken) {
      for (const card of ctx.boardData.cards) {
        await attachPrToTrelloCard(ctx.trelloToken, card.id, pr.url, pr.title);
      }
    }

    return { type: "pr_created", url: pr.url, number: pr.number, title: pr.title, draft: pr.draft };
  } catch (err) {
    console.error("[PR Automation] Failed to create PR:", err instanceof Error ? err.message : err);
    return null;
  }
}
