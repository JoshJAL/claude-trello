export type RoadmapStatus = "done" | "in-progress" | "planned";

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
}

export interface RoadmapCategory {
  name: string;
  items: RoadmapItem[];
}

export const ROADMAP: RoadmapCategory[] = [
  {
    name: "Legal & Compliance",
    items: [
      {
        id: "privacy-policy",
        title: "Privacy Policy",
        description:
          "A clear privacy policy explaining what data we collect, how it's stored, and how it's used.",
        status: "done",
      },
      {
        id: "terms-of-service",
        title: "Terms of Service",
        description:
          "User agreement covering acceptable use, liability, and service terms.",
        status: "done",
      },
      {
        id: "cookie-policy",
        title: "Cookie Policy & Consent Banner",
        description:
          "Documentation of cookies used (session auth, preferences) and a GDPR-compliant consent popup.",
        status: "done",
      },
      {
        id: "data-collection-explainer",
        title: "Data Collection Explainer",
        description:
          "User-facing page explaining exactly what we collect, why, and how long it's retained.",
        status: "done",
      },
    ],
  },
  {
    name: "User Experience",
    items: [
      {
        id: "feature-request-form",
        title: "Feature Request Form",
        description:
          "In-app form for users to submit feature ideas and vote on existing requests.",
        status: "done",
      },
      {
        id: "ui-polish",
        title: "UI Polish & Consistency",
        description:
          "Visual refinements, animation improvements, responsive fixes, and design system cleanup across all pages.",
        status: "in-progress",
      },
      {
        id: "bug-fixes",
        title: "Bug Fixes & Stability",
        description:
          "Ongoing fixes for reported issues, edge cases, and error handling improvements.",
        status: "in-progress",
      },
    ],
  },
  {
    name: "Core Features",
    items: [
      {
        id: "multi-provider",
        title: "Multi-AI Provider Support",
        description:
          "Run sessions with Claude, OpenAI (GPT-4o), or Groq (Llama 3.3) — each with their own API key.",
        status: "done",
      },
      {
        id: "parallel-agents",
        title: "Parallel Agents",
        description:
          "Run one agent per card/issue concurrently in isolated git worktrees with configurable concurrency.",
        status: "done",
      },
      {
        id: "github-gitlab",
        title: "GitHub & GitLab Integration",
        description:
          "Use GitHub issues and GitLab issues as task sources alongside Trello boards.",
        status: "done",
      },
      {
        id: "branch-selection",
        title: "Branch Selection",
        description:
          "Select an existing branch before starting a session instead of always auto-generating one.",
        status: "done",
      },
      {
        id: "session-history",
        title: "Session History & Replay",
        description:
          "Browse past sessions, view event logs, filter by source/status, and retry failed sessions.",
        status: "done",
      },
      {
        id: "cost-analytics",
        title: "Cost Tracking & Budget",
        description:
          "Per-session cost breakdown, monthly spending analytics, and configurable budget limits.",
        status: "done",
      },
      {
        id: "pr-automation",
        title: "PR/MR Automation",
        description:
          "Automatically create pull requests or merge requests after sessions complete.",
        status: "done",
      },
      {
        id: "webhooks",
        title: "Real-Time Webhooks",
        description:
          "Webhook-driven updates from Trello, GitHub, and GitLab with polling fallback.",
        status: "done",
      },
      {
        id: "cloud-mode",
        title: "Cloud Mode",
        description:
          "Run sessions entirely via GitHub/GitLab APIs without a local checkout.",
        status: "done",
      },
      {
        id: "desktop-app",
        title: "Desktop Application",
        description:
          "A native desktop app with the same interface as the web app, enabling local development without needing the CLI.",
        status: "planned",
      },
    ],
  },
];

/** Compute overall progress as a percentage */
export function getRoadmapProgress(): {
  done: number;
  inProgress: number;
  planned: number;
  total: number;
  percent: number;
} {
  let done = 0;
  let inProgress = 0;
  let planned = 0;

  for (const category of ROADMAP) {
    for (const item of category.items) {
      if (item.status === "done") done++;
      else if (item.status === "in-progress") inProgress++;
      else planned++;
    }
  }

  const total = done + inProgress + planned;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return { done, inProgress, planned, total, percent };
}
