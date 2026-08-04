// Lets the streamer pick a script.json straight from this project's own
// GitHub repository instead of needing it already on disk. Hardcoded to
// this repo (same spirit as the updater endpoint in tauri.conf.json) —
// this app only ever loads episodes authored here.
const REPO_OWNER = "azumag";
const REPO_NAME = "areNews";
const REPO_BRANCH = "main";
const PSEUDO_PATH_PREFIX = "github:";

const SCRIPT_PATH_PATTERN = /^episodes\/([^/]+)\/script\.json$/;

export type RepoEpisode = {
  /** e.g. "2026-08-04-pilot" */
  episodeDir: string;
  /** repo-relative path, e.g. "episodes/2026-08-04-pilot/script.json" */
  scriptPath: string;
};

export type GitTreeEntry = {
  path: string;
  type: string;
};

type GitTreeResponse = {
  tree: GitTreeEntry[];
  truncated?: boolean;
};

/** Pure filter/parse step, split out from the fetch so it's unit-testable
 * without mocking network calls. Episode directories are date-prefixed
 * slugs (YYYY-MM-DD-...), so a plain reverse string sort surfaces the
 * newest first. */
export function parseEpisodeScriptEntries(tree: GitTreeEntry[]): RepoEpisode[] {
  const episodes: RepoEpisode[] = [];
  for (const entry of tree) {
    if (entry.type !== "blob") continue;
    const match = SCRIPT_PATH_PATTERN.exec(entry.path);
    if (!match) continue;
    episodes.push({ episodeDir: match[1], scriptPath: entry.path });
  }
  episodes.sort((a, b) => b.episodeDir.localeCompare(a.episodeDir));
  return episodes;
}

/** Lists every script.json under episodes/ in one API call via the Git
 * Trees API (recursive), rather than walking directories one at a time and
 * multiplying rate-limited requests. */
export async function listRepoEpisodeScripts(): Promise<RepoEpisode[]> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${REPO_BRANCH}?recursive=1`;
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) {
    throw new Error(`GitHubからエピソード一覧を取得できません (HTTP ${response.status})`);
  }
  const data = (await response.json()) as GitTreeResponse;
  return parseEpisodeScriptEntries(data.tree);
}

export async function fetchRepoScriptContent(scriptPath: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${scriptPath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`台本を取得できません (HTTP ${response.status})`);
  }
  return response.text();
}

/** `scriptPath` is stored as the app's `scriptPath` state under a `github:`
 * prefix so "reload" and "reopen on startup" know to re-fetch from the
 * repository instead of reading a local file. */
export function toPseudoPath(scriptPath: string): string {
  return `${PSEUDO_PATH_PREFIX}${scriptPath}`;
}

export function isPseudoPath(path: string | null | undefined): path is string {
  return !!path && path.startsWith(PSEUDO_PATH_PREFIX);
}

export function fromPseudoPath(pseudoPath: string): string {
  return pseudoPath.slice(PSEUDO_PATH_PREFIX.length);
}
