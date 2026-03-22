import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq } from "drizzle-orm";
import { broadcast } from "./ws-manager";

export type WebhookSource = "trello" | "github" | "gitlab";

export interface WebhookEvent {
  source: WebhookSource;
  eventType: string;
  sourceIdentifier: string; // boardId, "owner/repo", projectId
  payload: Record<string, unknown>;
}

export interface NormalizedEvent {
  type: "task_updated" | "card_moved" | "issue_closed" | "pr_merged" | "generic";
  source: WebhookSource;
  sourceIdentifier: string;
  summary: string;
  data: Record<string, unknown>;
}

/**
 * Process an incoming webhook event:
 * 1. Normalize it into a standard format
 * 2. Find all users who have this source connected
 * 3. Broadcast to their WebSocket channels
 */
export async function processWebhook(event: WebhookEvent): Promise<void> {
  const normalized = normalizeEvent(event);

  // Find all users who have this source connected
  const linkedAccounts = await db
    .select({ userId: account.userId })
    .from(account)
    .where(eq(account.providerId, event.source));

  // Broadcast to each user's channel
  for (const acc of linkedAccounts) {
    broadcast(acc.userId, {
      type: "webhook_event",
      data: normalized as unknown as Record<string, unknown>,
    });
  }
}

function normalizeEvent(event: WebhookEvent): NormalizedEvent {
  switch (event.source) {
    case "trello":
      return normalizeTrelloEvent(event);
    case "github":
      return normalizeGitHubEvent(event);
    case "gitlab":
      return normalizeGitLabEvent(event);
  }
}

function normalizeTrelloEvent(event: WebhookEvent): NormalizedEvent {
  const action = event.payload.action as Record<string, unknown> | undefined;
  const actionType = (action?.type as string) ?? event.eventType;

  if (actionType === "updateCheckItemStateOnCard") {
    return {
      type: "task_updated",
      source: "trello",
      sourceIdentifier: event.sourceIdentifier,
      summary: "Checklist item updated",
      data: { actionType, cardId: (action?.data as Record<string, unknown>)?.card },
    };
  }

  if (actionType === "updateCard") {
    return {
      type: "card_moved",
      source: "trello",
      sourceIdentifier: event.sourceIdentifier,
      summary: "Card updated",
      data: { actionType },
    };
  }

  return {
    type: "generic",
    source: "trello",
    sourceIdentifier: event.sourceIdentifier,
    summary: `Trello event: ${actionType}`,
    data: { actionType },
  };
}

function normalizeGitHubEvent(event: WebhookEvent): NormalizedEvent {
  const action = event.payload.action as string | undefined;

  if (event.eventType === "issues") {
    if (action === "closed") {
      return {
        type: "issue_closed",
        source: "github",
        sourceIdentifier: event.sourceIdentifier,
        summary: `Issue closed: ${(event.payload.issue as Record<string, unknown>)?.title ?? ""}`,
        data: { action, issueNumber: (event.payload.issue as Record<string, unknown>)?.number },
      };
    }
    return {
      type: "task_updated",
      source: "github",
      sourceIdentifier: event.sourceIdentifier,
      summary: `Issue ${action}: ${(event.payload.issue as Record<string, unknown>)?.title ?? ""}`,
      data: { action },
    };
  }

  if (event.eventType === "pull_request" && action === "closed" && event.payload.pull_request) {
    const pr = event.payload.pull_request as Record<string, unknown>;
    return {
      type: pr.merged ? "pr_merged" : "generic",
      source: "github",
      sourceIdentifier: event.sourceIdentifier,
      summary: `PR ${pr.merged ? "merged" : "closed"}: ${pr.title ?? ""}`,
      data: { action, merged: pr.merged },
    };
  }

  return {
    type: "generic",
    source: "github",
    sourceIdentifier: event.sourceIdentifier,
    summary: `GitHub event: ${event.eventType} ${action ?? ""}`,
    data: { eventType: event.eventType, action },
  };
}

function normalizeGitLabEvent(event: WebhookEvent): NormalizedEvent {
  const objectKind = event.payload.object_kind as string | undefined;
  const attrs = event.payload.object_attributes as Record<string, unknown> | undefined;

  if (objectKind === "issue" && attrs) {
    if (attrs.action === "close") {
      return {
        type: "issue_closed",
        source: "gitlab",
        sourceIdentifier: event.sourceIdentifier,
        summary: `Issue closed: ${attrs.title ?? ""}`,
        data: { action: attrs.action, iid: attrs.iid },
      };
    }
    return {
      type: "task_updated",
      source: "gitlab",
      sourceIdentifier: event.sourceIdentifier,
      summary: `Issue ${attrs.action as string}: ${attrs.title ?? ""}`,
      data: { action: attrs.action },
    };
  }

  if (objectKind === "merge_request" && attrs) {
    if (attrs.action === "merge") {
      return {
        type: "pr_merged",
        source: "gitlab",
        sourceIdentifier: event.sourceIdentifier,
        summary: `MR merged: ${attrs.title ?? ""}`,
        data: { action: attrs.action },
      };
    }
  }

  return {
    type: "generic",
    source: "gitlab",
    sourceIdentifier: event.sourceIdentifier,
    summary: `GitLab event: ${objectKind ?? event.eventType}`,
    data: { objectKind },
  };
}
