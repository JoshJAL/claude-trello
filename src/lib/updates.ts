export type UpdateType = "feature" | "improvement" | "fix";

export interface UpdateDetailSection {
  heading: string;
  body: string; // plain text, supports line breaks
  code?: string; // optional code example
}

export interface AppUpdate {
  id: string; // unique, sortable identifier (ISO date + slug)
  date: string; // ISO date string (YYYY-MM-DD)
  title: string;
  description: string; // short summary shown on the list page
  type: UpdateType;
  phase?: string; // optional phase reference
  details?: UpdateDetailSection[]; // detailed breakdown shown on the detail page
}

/**
 * All app updates in reverse chronological order.
 * Add new entries to the TOP of this array.
 *
 * The `id` field must be unique and should sort chronologically.
 * Convention: "YYYY-MM-DD-slug"
 */
export const UPDATES: AppUpdate[] = [
  {
    id: "2026-03-22-toast-notifications",
    date: "2026-03-22",
    title: "Session Toast Notifications",
    description:
      "You now get a toast notification when a session completes, fails, or is stopped — so you don't have to watch the log to know when it's done.",
    type: "improvement",
  },
  {
    id: "2026-03-22-google-docs",
    date: "2026-03-22",
    title: "Google Docs Support",
    description:
      "Agents can now read, write, and create Google Docs in your Drive workspace. Documents are read as Markdown and content can be replaced or created from scratch.",
    type: "feature",
  },
  {
    id: "2026-03-22-workspace-file-preview",
    date: "2026-03-22",
    title: "Workspace File Preview & Folder Navigation",
    description:
      "The cloud storage workspace picker now shows files alongside folders so you can confirm you've selected the right folder. Navigate into subfolders with breadcrumb navigation.",
    type: "improvement",
  },
  {
    id: "2026-03-22-workspace-type-picker",
    date: "2026-03-22",
    title: "Unified Workspace Selector for Trello",
    description:
      "Trello boards now use a two-step workspace picker: first choose your workspace type (GitHub, GitLab, Google Drive, or OneDrive), then select the specific repo or folder.",
    type: "improvement",
  },
  {
    id: "2026-03-22-cloud-storage-workspaces",
    date: "2026-03-22",
    title: "Google Drive & OneDrive Workspaces",
    description:
      "AI agents can now work on files in Google Drive and OneDrive folders — not just code repos. Read, write, edit files and spreadsheets directly from your cloud storage.",
    type: "feature",
    details: [
      {
        heading: "How It Works",
        body: "Connect Google Drive or OneDrive in Settings via OAuth. When starting a Trello session in cloud mode, a new Workspace selector lets you pick a cloud storage folder. The AI agent gets tools for reading, writing, editing, and searching files — plus specialized tools for spreadsheets (Google Sheets and Excel).",
      },
      {
        heading: "Spreadsheet Support",
        body: "Agents can read spreadsheet data as structured tables, update specific cell ranges, and append new rows. Google Sheets uses the Sheets API directly. Excel files on OneDrive use the Microsoft Graph Excel endpoints.",
      },
      {
        heading: "CLI Support",
        body: "Use --workspace google:<folderId> or --workspace onedrive:<folderId> with the run command to specify a cloud storage workspace from the terminal.",
      },
    ],
  },
  {
    id: "2026-03-22-legal-and-feature-requests",
    date: "2026-03-22",
    title: "Privacy Policy, Terms, Cookie Consent & Feature Requests",
    description:
      "Added Privacy Policy, Terms of Service, Cookie Policy pages, a GDPR-compliant cookie consent banner, and a Feature Request form.",
    type: "feature",
    details: [
      {
        heading: "Legal Pages",
        body: "Three new public pages are now available: Privacy Policy (/privacy) with a detailed data collection explainer, Terms of Service (/terms), and Cookie Policy (/cookies) listing every cookie and localStorage item used by the app.",
      },
      {
        heading: "Cookie Consent Banner",
        body: "A non-intrusive banner appears at the bottom of the page for new visitors explaining that TaskPilot uses a single essential authentication cookie. The banner can be dismissed and won't appear again.",
      },
      {
        heading: "Feature Request Form",
        body: "A new Feature Request page (/feature-request) lets you submit ideas with a title, category, and description. The form pre-fills a GitHub issue and opens it in a new tab for submission.",
      },
    ],
  },
  {
    id: "2026-03-22-branch-selection",
    date: "2026-03-22",
    title: "Branch Selection for Cloud Mode",
    description:
      "You can now select an existing branch before starting a session in cloud mode. Agents will commit to the selected branch instead of auto-generating a new one.",
    type: "feature",
    details: [
      {
        heading: "How It Works",
        body: "A searchable branch selector appears in the session controls when using cloud mode with a GitHub or GitLab repository. You can search and select any existing branch, or leave it on 'Auto-generate' to keep the previous behavior.\n\nThis works on GitHub repo dashboards, GitLab project dashboards, and Trello boards with a linked repository. The selector resets when you change the linked repo.",
      },
    ],
  },
  {
    id: "2026-03-22-dynamic-provider-labels",
    date: "2026-03-22",
    title: "Dynamic Provider Labels & Work On This Fix",
    description:
      "The chat placeholder now shows the name of your selected AI provider (e.g. 'Send a message to ChatGPT...') instead of always saying Claude. The 'Work on this' button on cards and issues now uses your selected provider instead of defaulting to Claude.",
    type: "improvement",
    details: [
      {
        heading: "What Changed",
        body: "Previously the session chat input always said 'Send a message to Claude...' regardless of which provider you selected. Now it dynamically shows Claude, ChatGPT, or Groq based on your selection.\n\nThe 'Work on this' button on individual cards and issues also used to hardcode Claude as the provider. It now uses whichever provider you've selected in the session controls toolbar.",
      },
    ],
  },
  {
    id: "2026-03-22-searchable-repo-selector",
    date: "2026-03-22",
    title: "Searchable Repository Selector",
    description:
      "The Trello repo linker now uses a searchable combobox instead of a plain dropdown. Type to filter across all your GitHub repos and GitLab projects, with source icons and a clear button.",
    type: "improvement",
    details: [
      {
        heading: "How It Works",
        body: "When linking a repository to a Trello board in cloud mode, you now get a search input instead of a long dropdown. Start typing to filter across all your connected GitHub repos and GitLab projects. Results show source icons (GitHub/GitLab) next to each name.\n\nOnce selected, the repo appears as a chip with an X button to clear it.",
      },
    ],
  },
  {
    id: "2026-03-22-gitlab-token-refresh",
    date: "2026-03-22",
    title: "GitLab Connection No Longer Expires",
    description:
      "GitLab OAuth tokens are now automatically refreshed before they expire. Connect once and forget — no more reconnecting every 2 hours.",
    type: "fix",
    details: [
      {
        heading: "What Changed",
        body: "Previously, GitLab tokens expired every 2 hours and required you to reconnect in Settings. Now TaskPilot captures the refresh token during the OAuth flow and automatically refreshes your access token before it expires (with a 5-minute buffer).\n\nIf the refresh token itself is revoked (e.g. you revoke access in GitLab settings), you'll see a clear error message asking you to reconnect.",
      },
      {
        heading: "Do I Need to Reconnect?",
        body: "Yes, one final time. Existing GitLab connections were stored without a refresh token. Disconnect and reconnect GitLab in Settings to get the persistent connection. After that, it won't expire.",
      },
    ],
  },
  {
    id: "2026-03-22-webhooks-realtime",
    date: "2026-03-22",
    title: "Webhooks & Real-Time Updates",
    description:
      "Task source changes now push instantly via webhooks. Trello, GitHub, and GitLab webhook endpoints with signature validation. SSE-based real-time event stream with auto-reconnect. Connection status indicator in the sidebar shows live (green), connecting (amber), or polling (gray) mode.",
    type: "feature",
    phase: "Phase 20",
    details: [
      {
        heading: "How It Works",
        body: "When a card is updated in Trello, an issue is closed in GitHub, or a merge request is merged in GitLab, the webhook pushes the event to TaskPilot instantly. No more waiting for the 5-second polling interval.",
      },
      {
        heading: "Webhook Endpoints",
        body: "Each task source gets its own webhook receiver with proper signature validation:\n\n- Trello: HMAC-SHA1 signature verification using your app secret\n- GitHub: X-Hub-Signature-256 with timing-safe comparison\n- GitLab: X-Gitlab-Token header validation",
      },
      {
        heading: "Auto-Registration",
        body: "When you start your first session on a Trello board, TaskPilot automatically registers a webhook with Trello so future changes push in real time. For GitHub and GitLab, webhooks need to be set up manually in your repo settings — point them at your TaskPilot instance's /api/webhooks/github or /api/webhooks/gitlab endpoints.",
      },
      {
        heading: "Connection Status",
        body: "A small dot next to your avatar in the sidebar shows your connection state:\n\n- Green: Live updates active — changes push instantly\n- Amber (pulsing): Connecting to the event stream\n- Gray: Polling mode — updates check every 5 seconds\n\nIf the real-time connection drops, it automatically reconnects with exponential backoff.",
      },
      {
        heading: "Environment Variables",
        body: "Add these optional secrets to validate incoming webhooks:",
        code: "GITHUB_WEBHOOK_SECRET=your-github-webhook-secret\nGITLAB_WEBHOOK_SECRET=your-gitlab-webhook-token",
      },
    ],
  },
  {
    id: "2026-03-22-testing-ci",
    date: "2026-03-22",
    title: "Testing & CI Pipeline",
    description:
      "Added 58 unit tests covering encryption, cost calculation, task parsing, updates system, and PR generation. GitHub Actions CI pipeline runs type checking, tests, and builds on every push and PR.",
    type: "improvement",
    phase: "Phase 19",
    details: [
      {
        heading: "Test Suite",
        body: "58 unit tests across 5 test files covering the critical pure functions in the codebase:\n\n- encrypt.test.ts: AES-256-GCM round-trip, unique IVs, format validation, unicode handling\n- cost.test.ts: Per-provider cost calculation, fractional cent rounding, token usage extraction\n- parser.test.ts: Markdown task list parsing, checked/unchecked states, toggle by index\n- updates.test.ts: Changelog array ordering, unique IDs, unseen filtering\n- pr.test.ts: Task counting, issue extraction, branch naming, PR body generation",
      },
      {
        heading: "Running Tests",
        body: "Tests run with Vitest, configured for Node environment with path aliases matching the project's tsconfig.",
        code: "pnpm test          # Run all tests once\npnpm test:watch    # Watch mode\npnpm test:coverage # With V8 coverage report",
      },
      {
        heading: "CI Pipeline",
        body: "GitHub Actions runs on every push to main and on pull requests. Three jobs run in sequence:\n\n1. Lint & Type Check: runs tsc --noEmit\n2. Tests: runs vitest\n3. Build: runs the full production build (only after lint and tests pass)",
      },
    ],
  },
  {
    id: "2026-03-22-pr-automation",
    date: "2026-03-22",
    title: "PR/MR Automation",
    description:
      "Automatically create pull requests or merge requests after AI sessions complete. Configure in Settings: draft mode, auto-link issues, branch naming pattern. Works with GitHub and GitLab. For Trello boards with linked repos, PR URLs are attached to cards. CLI supports --pr and --no-pr flags.",
    type: "feature",
    phase: "Phase 18",
    details: [
      {
        heading: "How to Enable",
        body: "Go to Settings and find the \"PR Automation\" section. Toggle it on and configure your preferences:\n\n- Draft PR: Creates PRs as drafts so you can review before marking ready (on by default)\n- Auto-link Issues: Adds \"Closes #N\" to the PR body for GitHub issues\n- Branch Naming: Customize the pattern — use {source}, {id}, and {slug} placeholders",
      },
      {
        heading: "What Gets Created",
        body: "After a session completes successfully, TaskPilot creates a PR with:\n\n- A title like \"[TaskPilot] Add login feature (+2 more)\"\n- A body with task completion stats, provider info, and duration\n- A link back to the original issue(s)\n- TaskPilot attribution at the bottom\n\nPR creation is best-effort — if it fails, the session still completes normally.",
      },
      {
        heading: "Trello + GitHub/GitLab",
        body: "When your task source is Trello but you have a linked GitHub or GitLab repo, TaskPilot creates the PR on the linked repo and attaches the PR URL to each Trello card as a comment.",
      },
      {
        heading: "CLI Usage",
        body: "Use the --pr flag to create a PR from the command line, or --no-pr to skip even if automation is enabled in your settings.",
        code: "taskpilot run --pr           # Force PR creation\ntaskpilot run --no-pr        # Skip PR creation\ntaskpilot run                # Uses your Settings config",
      },
    ],
  },
  {
    id: "2026-03-22-task-dependencies",
    date: "2026-03-22",
    title: "Smart Task Dependencies",
    description:
      "Tasks are now ordered by dependencies. The app detects 'Depends on #N' and 'Blocked by #N' references in card descriptions and issue bodies. In parallel mode, blocked tasks wait until their dependencies complete. UI shows blocked/waiting status on cards. CLI supports --no-deps to skip dependency detection.",
    type: "feature",
    phase: "Phase 17",
    details: [
      {
        heading: "Dependency Syntax",
        body: "TaskPilot scans card descriptions and issue bodies for dependency references. The following patterns are recognized (case-insensitive):\n\n- \"Depends on #123\"\n- \"Blocked by #456\"\n- \"Requires #789\"\n\nFor Trello, it also checks checklist item names for \"[after Card Name]\" or \"[blocked by Card Name]\".\n\nFor GitHub and GitLab, labels containing \"blocked\" or \"depends-on\" are also detected.",
      },
      {
        heading: "Sequential Mode",
        body: "In sequential mode, tasks are reordered based on their dependencies using topological sort (Kahn's algorithm). Dependencies are completed first, and the agent prompt includes context about why tasks are ordered the way they are.",
      },
      {
        heading: "Parallel Mode",
        body: "In parallel mode, the orchestrator is dependency-aware:\n\n- Tasks with unmet dependencies start in a \"waiting\" state\n- Only \"ready\" tasks (all dependencies met) are assigned to workers\n- When a task completes, blocked tasks are re-evaluated and released if ready\n- If a task fails, all downstream dependents are marked as \"blocked\" with an explanation",
      },
      {
        heading: "UI Indicators",
        body: "Cards in the dashboard show dependency status:\n\n- A \"Blocked by: Card A, Card B\" chip appears on blocked cards\n- In parallel view, agent status rows show \"waiting\" (amber) and \"blocked\" (red) states\n- The progress summary includes waiting and blocked counts",
      },
      {
        heading: "Cycle Detection",
        body: "If circular dependencies are detected (A depends on B, B depends on A), they are reported and the cyclic tasks are placed at the end of the execution order. The session still runs — cycles don't block the entire run.",
      },
      {
        heading: "CLI",
        body: "The CLI prints dependency information before the session starts and updates as tasks resolve. Use --no-deps to skip dependency detection entirely.",
        code: "taskpilot run              # With dependency detection\ntaskpilot run --no-deps    # Skip dependencies, process in order",
      },
    ],
  },
  {
    id: "2026-03-22-cost-tracking",
    date: "2026-03-22",
    title: "Cost Tracking & Analytics",
    description:
      "Track spending across all AI providers with per-session token and cost breakdowns. New Analytics page with daily spend chart and provider comparison. Set monthly budget limits with configurable alert thresholds. CLI: `taskpilot usage` shows your monthly summary.",
    type: "feature",
    phase: "Phase 16",
    details: [
      {
        heading: "Token Tracking",
        body: "Every session now records input and output token counts from all three providers. Claude usage is extracted from the SDK's result messages. OpenAI and Groq usage comes from the chat completion response. Costs are calculated per-provider using current pricing and stored in cents to avoid floating-point issues.",
      },
      {
        heading: "Analytics Dashboard",
        body: "The new Analytics page (accessible from the sidebar) shows:\n\n- Summary cards: total spend, session count, tasks completed, total tokens\n- Daily spend bar chart for the last 30 days\n- Provider breakdown with a stacked bar showing Claude vs OpenAI vs Groq spend\n- Budget progress bar (if a budget is set)",
      },
      {
        heading: "Budget System",
        body: "Set a monthly spending limit in Settings under the \"Budget\" section:\n\n- Enter a dollar amount as your monthly limit\n- Set an alert threshold (default 80%) — you'll see a warning banner when you approach it\n- When the limit is reached, new sessions are blocked with a clear error message\n- The per-agent $2 cost cap from parallel mode still applies independently",
      },
      {
        heading: "CLI Usage Command",
        body: "Check your spending from the terminal with the usage command.",
        code: "taskpilot usage\n\n# Output:\n# Usage — March 2026\n#\n#   Total Spend:  $4.52\n#   Sessions:     12\n#   Tasks Done:   34\n#   Avg / Session: $0.38\n#   Tokens:       1.2M in / 450K out\n#   Budget:       $4.52 / $10.00 (45%)",
      },
    ],
  },
  {
    id: "2026-03-22-session-history",
    date: "2026-03-22",
    title: "Session History & Persistence",
    description:
      "Every AI agent session is now recorded. Browse past sessions, review event logs, see cost and task completion stats. Available from the new History page in the sidebar and via `taskpilot history` in the CLI.",
    type: "feature",
    phase: "Phase 15",
    details: [
      {
        heading: "What Gets Recorded",
        body: "Every session now persists to the database with:\n\n- Source and board/repo information\n- AI provider and mode (sequential/parallel)\n- Status (running, completed, failed, cancelled)\n- Input/output token counts and cost\n- Task completion counts (completed/total)\n- Start time, end time, and duration\n- Full event log with every message, tool call, and result",
      },
      {
        heading: "History Page",
        body: "The History page in the sidebar shows all past sessions in a filterable list:\n\n- Filter by source (Trello, GitHub, GitLab)\n- Filter by status (completed, failed, cancelled)\n- Sort by newest, oldest, or most expensive\n- Each row shows the source, board name, status badge, task progress, cost, and duration\n- Click a session to see the full detail view with event log replay",
      },
      {
        heading: "Session Detail",
        body: "The detail page for each session shows:\n\n- Metadata grid: provider, mode, tasks, duration, cost, tokens, timestamps\n- Error message (if the session failed)\n- Initial message (if one was provided)\n- Scrollable event log with type-based color coding\n- Agent index tags for parallel session events\n- Pagination for sessions with many events",
      },
      {
        heading: "CLI",
        body: "Browse session history from the terminal.",
        code: "taskpilot history              # List last 10 sessions\ntaskpilot history --all        # List all sessions\ntaskpilot history <id>         # Session detail\ntaskpilot history <id> --events  # Full event log",
      },
    ],
  },
  {
    id: "2026-03-20-gitlab-integration",
    date: "2026-03-20",
    title: "GitLab Integration",
    description:
      "Connect your GitLab account to run AI agents against GitLab issues. Task list items in issue descriptions are parsed and tracked automatically. Supports merge request creation via MCP tools.",
    type: "feature",
    phase: "Phase 14",
    details: [
      {
        heading: "Connecting GitLab",
        body: "Go to Settings and click \"Connect GitLab\" in the Task Sources section. You'll be redirected to GitLab to authorize TaskPilot. Once connected, your projects appear in the GitLab section of the sidebar.",
      },
      {
        heading: "Issues as Tasks",
        body: "GitLab issues with markdown task lists (- [ ] / - [x]) are parsed into checkable items. The AI agent works through each unchecked item and marks them complete in the issue description as it goes.",
      },
      {
        heading: "MCP Tools",
        body: "The agent has access to GitLab-specific tools:\n\n- check_gitlab_task: Toggle a task item in an issue description\n- close_gitlab_issue: Close an issue after all tasks are done\n- comment_on_issue: Add a note to an issue\n- create_merge_request: Create an MR with the agent's changes",
      },
    ],
  },
  {
    id: "2026-03-18-github-integration",
    date: "2026-03-18",
    title: "GitHub Integration",
    description:
      "Connect your GitHub account to use issues as task sources. Markdown task lists in issue bodies are parsed into checkable items. Agents can check tasks, close issues, comment, and create pull requests.",
    type: "feature",
    phase: "Phase 13",
    details: [
      {
        heading: "Connecting GitHub",
        body: "Go to Settings and click \"Connect GitHub\" in the Task Sources section. You'll be redirected to GitHub to authorize TaskPilot. Once connected, your repositories appear in the GitHub section of the sidebar.",
      },
      {
        heading: "Issues as Tasks",
        body: "GitHub issues with markdown task lists (- [ ] / - [x]) are parsed into checkable items. The AI agent works through each unchecked item and marks them complete in the issue body.",
      },
      {
        heading: "MCP Tools",
        body: "The agent has access to GitHub-specific tools:\n\n- check_github_task: Toggle a task item in an issue body\n- close_github_issue: Close an issue after all tasks are done\n- comment_on_issue: Add a comment to an issue\n- create_pull_request: Create a PR with the agent's changes",
      },
    ],
  },
  {
    id: "2026-03-15-multi-ai-providers",
    date: "2026-03-15",
    title: "Multi-AI Provider Support",
    description:
      "Run sessions with OpenAI (GPT-4o) or Groq (Llama 3.3 70B) in addition to Claude. Each provider gets its own API key. Switch providers per session from the dashboard or CLI.",
    type: "feature",
    phase: "Phase 12",
    details: [
      {
        heading: "Supported Providers",
        body: "TaskPilot supports three AI providers:\n\n- Claude (Anthropic): Uses the Claude Agent SDK for best performance. Supports interactive Q&A during sessions.\n- OpenAI (GPT-4o): Uses the chat completions API with function calling for coding tools.\n- Groq (Llama 3.3 70B): Fast inference via Groq's API, same function calling pattern as OpenAI.",
      },
      {
        heading: "Adding API Keys",
        body: "Go to Settings and add your API key for each provider you want to use. Each key is validated against the provider's format before being encrypted and stored:\n\n- Claude: starts with sk-ant-api03-\n- OpenAI: starts with sk- (but not sk-ant-)\n- Groq: starts with gsk_",
      },
      {
        heading: "Switching Providers",
        body: "When starting a session from the dashboard, a provider dropdown appears if you have more than one configured. In the CLI, use the --provider flag.",
        code: "taskpilot run --provider openai\ntaskpilot run --provider groq\ntaskpilot run -P claude        # Short form",
      },
    ],
  },
  {
    id: "2026-03-12-parallel-agents",
    date: "2026-03-12",
    title: "Parallel Agents",
    description:
      "Process multiple cards simultaneously with one agent per card in isolated git worktrees. Configurable concurrency (1-5). Automatic merge with conflict detection.",
    type: "feature",
    phase: "Phase 11",
    details: [
      {
        heading: "How It Works",
        body: "In parallel mode, each card gets its own AI agent running in an isolated git worktree. Agents work independently and concurrently. When all agents finish, their branches are merged sequentially into an integration branch.",
      },
      {
        heading: "Configuration",
        body: "Toggle between Sequential and Parallel mode on the board session view. Adjust the concurrency slider (1-5 agents) based on your needs. Each agent has a $2 cost budget by default.",
      },
      {
        heading: "Merge & Conflicts",
        body: "After all agents complete, TaskPilot merges each worktree branch into the integration branch one at a time. If merge conflicts occur, they are reported in the session summary with the affected files listed.",
      },
      {
        heading: "CLI Usage",
        body: "Use the --parallel flag with optional concurrency.",
        code: "taskpilot run --parallel             # 3 concurrent agents (default)\ntaskpilot run -p -c 5               # 5 concurrent agents\ntaskpilot run --parallel --concurrency 1  # Sequential-like but with worktrees",
      },
    ],
  },
  {
    id: "2026-03-10-documentation",
    date: "2026-03-10",
    title: "Documentation & Landing Page",
    description:
      "Full CLI reference docs available at /docs/cli. Landing page with feature overview and getting started guide.",
    type: "improvement",
    phase: "Phase 10",
    details: [
      {
        heading: "CLI Documentation",
        body: "The /docs/cli page in the web app has a full reference for every CLI command, including all flags, examples, and troubleshooting tips.",
      },
      {
        heading: "Landing Page",
        body: "A separate landing page (taskpilot-frontend repo) provides a public-facing overview with a hero section, terminal preview, how-it-works steps, feature grid, and getting started instructions. Supports dark/light/auto theme.",
      },
    ],
  },
  {
    id: "2026-03-08-cli-tool",
    date: "2026-03-08",
    title: "CLI Tool",
    description:
      "Run TaskPilot from your terminal with `npx taskpilot-cli`. Interactive board selection, streaming session output, and MCP tools running locally.",
    type: "feature",
    phase: "Phase 9",
    details: [
      {
        heading: "Installation",
        body: "No install needed — run directly with npx. Or install globally for faster startup.",
        code: "npx taskpilot-cli          # Run directly\nnpm i -g taskpilot-cli     # Or install globally\ntaskpilot login            # Sign in with your TaskPilot account",
      },
      {
        heading: "Commands",
        body: "Available commands:\n\n- register: Create a new account\n- login / logout: Sign in and out\n- setup: Interactive wizard to connect Trello and add API key\n- boards: List your Trello boards\n- repos: List your GitHub repos\n- run: Start an AI session on a board or repo\n- status: Check your connection and integration status\n- history: View past sessions\n- usage: Show monthly spending",
      },
      {
        heading: "Running Sessions",
        body: "The run command provides interactive board/repo selection, shows a board overview, then launches the AI session with streaming output. Tool calls are shown with descriptive labels.",
        code: "taskpilot run                           # Interactive selection\ntaskpilot run -b BOARD_ID               # Direct board\ntaskpilot run -m \"Focus on the auth bug\" # With instructions\ntaskpilot run --source github           # GitHub issues",
      },
    ],
  },
  {
    id: "2026-03-06-sidebar-rebrand",
    date: "2026-03-06",
    title: "TaskPilot Rebrand & Sidebar Navigation",
    description:
      "Rebranded from Claude Trello to TaskPilot. New collapsible sidebar navigation replaces the old header tabs.",
    type: "improvement",
    details: [
      {
        heading: "Why TaskPilot?",
        body: "The app now supports multiple AI providers (Claude, OpenAI, Groq) and multiple task sources (Trello, GitHub, GitLab), making the original \"Claude Trello\" name misleading. TaskPilot reflects the broader mission: point AI agents at any task board.",
      },
      {
        heading: "Sidebar Navigation",
        body: "The flat header tabs have been replaced with a collapsible sidebar:\n\n- Collapses to 60px icons, expands to 240px with labels\n- Collapse state persists in localStorage\n- Desktop: always visible alongside content\n- Mobile: overlay with hamburger button in a thin top bar\n- Sections: Sources (Trello, GitHub, GitLab), Navigation (History, Analytics, Updates, Settings, Docs), User/theme/sign-out at bottom\n- Active route highlighting with fuzzy matching",
      },
    ],
  },
];

/**
 * Find an update by its ID.
 */
export function getUpdateById(id: string): AppUpdate | undefined {
  return UPDATES.find((u) => u.id === id);
}

/**
 * Get updates newer than the given date.
 * Returns updates sorted newest-first (same order as UPDATES array).
 */
export function getUnseenUpdates(lastSeenAt: Date | null): AppUpdate[] {
  if (!lastSeenAt) return UPDATES;
  return UPDATES.filter((u) => new Date(u.date) > lastSeenAt);
}

/**
 * Get the most recent update date across all updates.
 */
export function getLatestUpdateDate(): Date {
  return new Date(UPDATES[0].date);
}
