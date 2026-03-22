export type { AiProviderId } from "#/lib/providers/types";

export interface IntegrationStatus {
  trelloLinked: boolean;
  githubLinked: boolean;
  gitlabLinked: boolean;
  googleDriveLinked: boolean;
  oneDriveLinked: boolean;
  hasApiKey: boolean;
  configuredProviders: Array<"claude" | "openai" | "groq">;
}

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  url: string;
  closed: boolean;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList?: string;
  pos?: number;
  checklists: TrelloChecklist[];
}

export interface TrelloChecklist {
  id: string;
  name: string;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete" | string;
  pos?: number;
}

export interface TrelloList {
  id: string;
  name: string;
  pos: number;
}

export interface BoardData {
  board: { id: string; name: string };
  cards: TrelloCard[];
  doneListId?: string;
}

export interface ApiKeyPayload {
  apiKey: string;
}

// ── Parallel Agents (Phase 11) ──────────────────────────────────────────────

export interface ParallelSessionConfig {
  mode: "sequential" | "parallel";
  maxConcurrency: number; // default 3
}

export interface AgentStatus {
  cardId: string;
  cardName: string;
  state:
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "merging"
    | "conflict";
  branch?: string;
  worktreePath?: string;
  checklistTotal: number;
  checklistDone: number;
  error?: string;
  costUsd?: number;
  durationMs?: number;
}

export type ParallelEvent =
  | { type: "agent_queued"; cardId: string; cardName: string }
  | {
      type: "agent_started";
      cardId: string;
      branch: string;
      worktreePath: string;
    }
  | { type: "agent_message"; cardId: string; message: unknown }
  | { type: "agent_completed"; cardId: string; status: AgentStatus }
  | { type: "agent_failed"; cardId: string; error: string }
  | { type: "merge_started"; cardId: string }
  | {
      type: "merge_completed";
      cardId: string;
      success: boolean;
      conflicts?: string[];
    }
  | { type: "summary"; summary: ParallelSessionSummary };

export interface ParallelSessionSummary {
  agents: AgentStatus[];
  totalCostUsd: number;
  totalDurationMs: number;
  integrationBranch: string;
  mergeConflicts: Array<{ cardId: string; files: string[] }>;
  diffStats: { filesChanged: number; insertions: number; deletions: number };
}

// ── Session History (Phase 15) ────────────────────────────────────────────────

export type SessionStatus = "running" | "completed" | "failed" | "cancelled";

export interface AgentSessionSummary {
  id: string;
  source: string;
  sourceIdentifier: string;
  sourceName: string;
  providerId: string;
  mode: "sequential" | "parallel";
  maxConcurrency: number | null;
  initialMessage: string | null;
  status: SessionStatus;
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  totalCostCents: number;
  tasksTotal: number;
  tasksCompleted: number;
  startedAt: string; // ISO date string for JSON transport
  completedAt: string | null;
  durationMs: number | null;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: string;
  agentIndex: number | null;
  cardId: string | null;
  content: Record<string, unknown>;
  sequence: number;
  timestamp: string; // ISO date string
}

export interface SessionListQuery {
  source?: string;
  status?: SessionStatus;
  limit?: number;
  offset?: number;
  sort?: "newest" | "oldest" | "costliest";
}

export interface SessionListResponse {
  sessions: AgentSessionSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionDetailResponse {
  session: AgentSessionSummary;
}

export interface SessionEventsResponse {
  events: SessionEvent[];
  total: number;
  limit: number;
  offset: number;
}

// ── PR/MR Automation (Phase 18) ─────────────────────────────────────────────

export interface PrAutomationConfig {
  enabled: boolean;
  autoDraft: boolean;
  autoLinkIssue: boolean;
  branchNamingPattern: string;
}

export const DEFAULT_PR_AUTOMATION_CONFIG: PrAutomationConfig = {
  enabled: false,
  autoDraft: true,
  autoLinkIssue: true,
  branchNamingPattern: "{type}/{provider}-{slug}",
};

export interface PrResult {
  url: string;
  number: number;
  title: string;
  draft: boolean;
}
