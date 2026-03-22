import type { GitHubRepo } from "#/lib/github/types";
import type { GitLabProject } from "#/lib/gitlab/types";

interface RepoLinkerProps {
  linkedRepoKey: string;
  onLinkedRepoKeyChange: (key: string) => void;
  githubLinked: boolean;
  gitlabLinked: boolean;
  ghRepos?: GitHubRepo[];
  glProjects?: GitLabProject[];
}

export function RepoLinker({
  linkedRepoKey,
  onLinkedRepoKeyChange,
  githubLinked,
  gitlabLinked,
  ghRepos,
  glProjects,
}: RepoLinkerProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="linked-repo" className="text-xs font-medium text-(--sea-ink-soft)">
        Repository:
      </label>
      <select
        id="linked-repo"
        value={linkedRepoKey}
        onChange={(e) => onLinkedRepoKeyChange(e.target.value)}
        className="flex-1 rounded-lg border border-(--shore-line) bg-white px-2 py-1.5 text-xs text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
      >
        <option value="">None (advisory only)</option>
        {githubLinked && ghRepos && ghRepos.length > 0 && (
          <optgroup label="GitHub">
            {ghRepos.map((r) => (
              <option key={`github:${r.full_name}`} value={`github:${r.full_name}`}>
                {r.full_name}
              </option>
            ))}
          </optgroup>
        )}
        {gitlabLinked && glProjects && glProjects.length > 0 && (
          <optgroup label="GitLab">
            {glProjects.map((p) => (
              <option key={`gitlab:${p.id}`} value={`gitlab:${p.id}`}>
                {p.path_with_namespace}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
