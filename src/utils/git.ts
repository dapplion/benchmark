import {shell} from "./shell.js";

export async function getCurrentCommitInfo(): Promise<{
  /** commit hash `71f08b12d45d44255c31f7b7d135bd15a93fdaac` */
  commitSha: string;
  /** committer date, UNIX timestamp in seconds */
  timestamp: number;
}> {
  const commitSha = await shell("git show -s --format=%H");
  const timestampStr = await shell("git show -s --format=%ct");
  const timestamp = parseInt(timestampStr, 10);

  if (!timestamp || isNaN(timestamp)) {
    throw Error(`Invalid timestampStr ${timestampStr}`);
  }

  return {
    commitSha,
    timestamp,
  };
}

/**
 * Returns a chornological list of commits from `$branch`.
 *
 * - `--format=format:%H`: Print the full commit hash only
 * - `-n`: Display up to n commits
 * - `--no-pager` suppress interactive mode
 *
 * (from git-log docs):
 * List commits that are reachable by following the parent links from the given commit(s),
 * but exclude commits that are reachable from the one(s) given with a ^ in front of them.
 * The output is given in reverse chronological order by default.
 */
export async function getBranchCommitList(branch: string, n = 50): Promise<string[]> {
  await ensureBranchExists(branch);

  const commitsStr = await shell(`git --no-pager log --format=format:%H -n ${n} ${branch}`);
  return commitsStr.trim().split("\n");
}

/**
 * Resolve a heads ref
 */
export async function getBranchLatestCommit(branch: string): Promise<string> {
  await ensureBranchExists(branch);

  const res = await shell(`git rev-parse refs/heads/${branch}`);
  return res.trim();
}

/**
 * Ensure branch exists locally or try to fetch it from origin.
 * When using actions/checkout users normally only clone a single commit.
 * Getting the entire git history for all branches is a bit more tricky than this.
 */
async function ensureBranchExists(branch: string): Promise<void> {
  const refExists = await shell(`git show-ref --verify --quiet refs/heads/${branch}`).then(
    () => true,
    () => false
  );

  if (!refExists) {
    await shell(`git fetch origin ${branch}`);
  }
}
