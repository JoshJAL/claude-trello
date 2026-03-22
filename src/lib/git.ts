import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";

const exec = promisify(execFile);

async function git(
  cwd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return exec("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  const { stdout } = await git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

export async function getCurrentSha(cwd: string): Promise<string> {
  const { stdout } = await git(cwd, ["rev-parse", "HEAD"]);
  return stdout.trim();
}

/**
 * Create a git worktree for a parallel agent.
 * Returns the absolute path to the new worktree directory.
 */
export async function createWorktree(
  cwd: string,
  branchName: string,
): Promise<string> {
  const worktreePath = join(cwd, ".taskpilot-worktrees", branchName);
  await git(cwd, ["worktree", "add", "-b", branchName, worktreePath, "HEAD"]);

  // Symlink node_modules to avoid reinstalling dependencies
  try {
    const { stdout } = await exec("ls", ["-d", join(cwd, "node_modules")]);
    if (stdout.trim()) {
      await exec("ln", [
        "-sf",
        join(cwd, "node_modules"),
        join(worktreePath, "node_modules"),
      ]);
    }
  } catch {
    // node_modules doesn't exist in the main repo, skip
  }

  return worktreePath;
}

export async function removeWorktree(
  cwd: string,
  worktreePath: string,
): Promise<void> {
  await git(cwd, ["worktree", "remove", "--force", worktreePath]);
}

export interface MergeResult {
  success: boolean;
  conflicts: string[];
}

/**
 * Merge an agent branch into the target branch.
 * Returns success and any conflicting file paths.
 */
export async function mergeWorktreeBranch(
  cwd: string,
  branch: string,
  target: string,
): Promise<MergeResult> {
  // Ensure we're on the target branch
  await git(cwd, ["checkout", target]);

  try {
    await git(cwd, [
      "merge",
      "--no-ff",
      "-m",
      `Merge parallel agent: ${branch}`,
      branch,
    ]);
    return { success: true, conflicts: [] };
  } catch (err) {
    // Check for merge conflicts
    const { stdout } = await git(cwd, ["diff", "--name-only", "--diff-filter=U"]);
    const conflicts = stdout
      .trim()
      .split("\n")
      .filter((f) => f.length > 0);

    if (conflicts.length > 0) {
      // Abort the merge so the branch is left clean for manual resolution
      await git(cwd, ["merge", "--abort"]);
      return { success: false, conflicts };
    }

    // Some other git error
    throw err;
  }
}

export interface DiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export async function getDiffStats(
  cwd: string,
  base: string,
  head: string,
): Promise<DiffStats> {
  try {
    const { stdout } = await git(cwd, [
      "diff",
      "--stat",
      "--numstat",
      `${base}...${head}`,
    ]);

    let filesChanged = 0;
    let insertions = 0;
    let deletions = 0;

    for (const line of stdout.trim().split("\n")) {
      const match = line.match(/^(\d+)\t(\d+)\t/);
      if (match) {
        filesChanged++;
        insertions += parseInt(match[1], 10);
        deletions += parseInt(match[2], 10);
      }
    }

    return { filesChanged, insertions, deletions };
  } catch {
    return { filesChanged: 0, insertions: 0, deletions: 0 };
  }
}

/**
 * Create an integration branch for parallel session results.
 */
export async function createIntegrationBranch(
  cwd: string,
  sessionId: string,
): Promise<string> {
  const branchName = `parallel/integration/${sessionId}`;
  await git(cwd, ["checkout", "-b", branchName]);
  return branchName;
}

/**
 * Delete a branch (local only).
 */
export async function deleteBranch(
  cwd: string,
  branch: string,
): Promise<void> {
  try {
    await git(cwd, ["branch", "-D", branch]);
  } catch {
    // Branch may already be deleted
  }
}
