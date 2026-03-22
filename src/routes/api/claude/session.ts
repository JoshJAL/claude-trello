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
} from "#/lib/providers/source-tools";
import {
  WEB_GITHUB_SYSTEM_PROMPT,
  WEB_GITLAB_SYSTEM_PROMPT,
  WEB_TRELLO_ADVISORY_PROMPT,
} from "#/lib/providers/prompts";
import { buildUserPrompt } from "#/lib/prompts";
import type { Query } from "#/lib/claude";
import type { BoardData } from "#/lib/types";

interface ActiveSession {
  query?: Query;
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

        if (!boardData?.board?.id || !boardData?.cards) {
          return Response.json(
            { error: "boardData is required" },
            { status: 400 },
          );
        }

        // Determine session mode: web or local
        const isLocal =
          request.headers.get("host")?.startsWith("localhost") ||
          request.headers.get("host")?.startsWith("127.0.0.1");
        const sessionMode: SessionMode =
          webMode || (!isLocal && !cwd) ? "web" : "local";

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

          const [gitlabAccount] = await db
            .select({ accessToken: account.accessToken })
            .from(account)
            .where(
              and(
                eq(account.userId, userId),
                eq(account.providerId, "gitlab"),
              ),
            )
            .limit(1);

          if (!gitlabAccount?.accessToken) {
            return Response.json(
              { error: "GitLab not connected" },
              { status: 400 },
            );
          }
          sourceToken = gitlabAccount.accessToken;
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

        // Source metadata passed to session launchers
        const sourceParams = { source, sourceToken, githubOwner, githubRepo, gitlabProjectId };

        const abortController = new AbortController();

        // Abort the session if the client disconnects
        request.signal.addEventListener("abort", () => {
          abortController.abort();
          activeSessions.delete(userId);
        });

        // ── Web mode ──────────────────────────────────────────────────────
        if (sessionMode === "web") {
          const webConfig = buildWebConfig(source, sourceToken, {
            githubOwner,
            githubRepo,
            gitlabProjectId,
            trelloToken,
            boardId: boardData.board.id,
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
                  const data = JSON.stringify(message);
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "done" })}\n\n`,
                  ),
                );
              } catch (err) {
                const errorMsg =
                  err instanceof Error ? err.message : "Unknown error";
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`,
                  ),
                );
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
                  const data = JSON.stringify(event);
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "done" })}\n\n`,
                  ),
                );
              } catch (err) {
                const errorMsg =
                  err instanceof Error ? err.message : "Unknown error";
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`,
                  ),
                );
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
        });

        activeSessions.set(userId, {
          abortController,
          mode: "sequential",
          // Only Claude's Agent SDK supports streamInput for interactive Q&A
          query: providerId === "claude"
            ? (providerSession as unknown as Query)
            : undefined,
        });

        // Stream SSE response
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();

            try {
              for await (const message of providerSession) {
                const data = JSON.stringify(message);
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "done" })}\n\n`,
                ),
              );
            } catch (err) {
              const errorMsg =
                err instanceof Error ? err.message : "Unknown error";
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`,
                ),
              );
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
    };
    const webTools = createWebToolSet(ctx);
    const sourceTools = createGitHubSourceToolSet(
      sourceToken,
      opts.githubOwner,
      opts.githubRepo,
    );
    return {
      systemPrompt: WEB_GITHUB_SYSTEM_PROMPT,
      toolSet: mergeToolSets(webTools, sourceTools),
      buildUserPrompt: buildGitHubWebPrompt,
    };
  }

  if (source === "gitlab" && opts.gitlabProjectId) {
    const ctx: WebToolContext = {
      source: "gitlab",
      sourceToken,
      gitlabProjectId: opts.gitlabProjectId,
      fileShas: new Map(),
    };
    const webTools = createWebToolSet(ctx);
    const sourceTools = createGitLabSourceToolSet(
      sourceToken,
      opts.gitlabProjectId,
    );
    return {
      systemPrompt: WEB_GITLAB_SYSTEM_PROMPT,
      toolSet: mergeToolSets(webTools, sourceTools),
      buildUserPrompt: buildGitLabWebPrompt,
    };
  }

  // Trello web mode: advisory only (task tools but no file ops)
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
