import type { BoardData, TrelloCard } from "#/lib/types";
import type { GitHubIssue } from "#/lib/github/types";
import type { GitLabIssue } from "#/lib/gitlab/types";

export const SYSTEM_PROMPT = `You are operating on a codebase. You have been given a Trello board containing tasks.
Work through each card and checklist item in order.
For each checklist item you complete, call the check_trello_item tool with the checkItemId and cardId.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL checklist items on a card, call move_card_to_done with the cardId to move it to the Done list.
Once a card is in Done, do not interact with it again — move on to the next card.
Focus on one card at a time. Complete all its items, move it to Done, then proceed to the next.`;

export function buildUserPrompt(
  boardData: BoardData,
  userMessage?: string,
): string {
  let prompt = `Here is the Trello board with tasks to complete:\n\n${JSON.stringify(boardData, null, 2)}`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}

// ── Parallel Agent Prompts ──────────────────────────────────────────────────

export const PARALLEL_AGENT_SYSTEM_PROMPT = `You are assigned ONE card from a Trello board. Focus exclusively on it.
Work through each checklist item in order. For each item you complete, call check_trello_item with the checkItemId and cardId.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL checklist items, call move_card_to_done with the cardId.
You are working in an isolated git worktree. Commit your changes when done.
Do NOT modify files outside the scope of your assigned card.`;

export function buildParallelCardPrompt(
  card: TrelloCard,
  boardName: string,
  userMessage?: string,
): string {
  const cardData = {
    board: { name: boardName },
    card: {
      id: card.id,
      name: card.name,
      desc: card.desc,
      checklists: card.checklists,
    },
  };

  let prompt = `Here is your assigned card:\n\n${JSON.stringify(cardData, null, 2)}`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}

// ── GitHub Prompts ──────────────────────────────────────────────────────────

export const GITHUB_SYSTEM_PROMPT = `You are operating on a codebase. You have been given GitHub issues containing tasks.
Work through each issue and its task list items in order.
For each task item you complete, call check_github_task with the issueNumber and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items on an issue, call close_github_issue with the issueNumber.
When you have finished all issues, call create_pull_request to submit your changes.
Focus on one issue at a time. Complete all its tasks, close it, then proceed to the next.`;

export const GITHUB_PARALLEL_SYSTEM_PROMPT = `You are assigned ONE GitHub issue. Focus exclusively on it.
Work through each task list item in order. For each item you complete, call check_github_task with the issueNumber and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items, call close_github_issue with the issueNumber.
You are working in an isolated git worktree. Commit your changes when done.
Do NOT modify files outside the scope of your assigned issue.`;

export interface GitHubIssueWithTasks extends GitHubIssue {
  tasks: Array<{ index: number; text: string; checked: boolean }>;
}

export function buildGitHubUserPrompt(
  repoFullName: string,
  issues: GitHubIssueWithTasks[],
  userMessage?: string,
): string {
  const data = {
    repo: repoFullName,
    issues: issues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body,
      tasks: issue.tasks,
    })),
  };

  let prompt = `Here are the GitHub issues with tasks to complete:\n\n${JSON.stringify(data, null, 2)}`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}

export function buildGitHubIssuePrompt(
  repoFullName: string,
  issue: GitHubIssueWithTasks,
  userMessage?: string,
): string {
  const data = {
    repo: repoFullName,
    issue: {
      number: issue.number,
      title: issue.title,
      body: issue.body,
      tasks: issue.tasks,
    },
  };

  let prompt = `Here is your assigned GitHub issue:\n\n${JSON.stringify(data, null, 2)}`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}

// ── GitLab Prompts ──────────────────────────────────────────────────────────

export const GITLAB_SYSTEM_PROMPT = `You are operating on a codebase. You have been given GitLab issues containing tasks.
Work through each issue and its task list items in order.
For each task item you complete, call check_gitlab_task with the issueIid and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items on an issue, call close_gitlab_issue with the issueIid.
When you have finished all issues, call create_merge_request to submit your changes.
Focus on one issue at a time. Complete all its tasks, close it, then proceed to the next.`;

export const GITLAB_PARALLEL_SYSTEM_PROMPT = `You are assigned ONE GitLab issue. Focus exclusively on it.
Work through each task list item in order. For each item you complete, call check_gitlab_task with the issueIid and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items, call close_gitlab_issue with the issueIid.
You are working in an isolated git worktree. Commit your changes when done.
Do NOT modify files outside the scope of your assigned issue.`;

export interface GitLabIssueWithTasks extends GitLabIssue {
  tasks: Array<{ index: number; text: string; checked: boolean }>;
}

export function buildGitLabUserPrompt(
  projectName: string,
  issues: GitLabIssueWithTasks[],
  userMessage?: string,
): string {
  const data = {
    project: projectName,
    issues: issues.map((issue) => ({
      iid: issue.iid,
      title: issue.title,
      description: issue.description,
      tasks: issue.tasks,
    })),
  };

  let prompt = `Here are the GitLab issues with tasks to complete:\n\n${JSON.stringify(data, null, 2)}`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}

export function buildGitLabIssuePrompt(
  projectName: string,
  issue: GitLabIssueWithTasks,
  userMessage?: string,
): string {
  const data = {
    project: projectName,
    issue: {
      iid: issue.iid,
      title: issue.title,
      description: issue.description,
      tasks: issue.tasks,
    },
  };

  let prompt = `Here is your assigned GitLab issue:\n\n${JSON.stringify(data, null, 2)}`;
  if (userMessage?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${userMessage.trim()}`;
  }
  return prompt;
}
