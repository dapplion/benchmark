import {Opts} from "../types.js";
import {getDefaultBranch} from "../utils/defaultBranch.js";

export async function resolveShouldPersist(opts: Opts, branch: string): Promise<boolean> {
  // Force persist
  if (opts.persist === true) return true;
  // Do not persist
  if (opts.persist === false) return false;

  // User provides exact list of branches
  if (opts.persistBranches) {
    return opts.persistBranches.includes(branch);
  }

  // Default to only persist the default branch
  const repoDefaultBranch = await getDefaultBranch(opts);
  return branch === repoDefaultBranch;
}
