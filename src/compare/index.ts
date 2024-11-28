import * as github from "@actions/github";
import {Benchmark, Opts} from "../types.js";
import {getGithubEventData, GithubActionsEventData, parseBranchFromRef, getDefaultBranch} from "../utils/index.js";
import {isGaRun} from "../github/context.js";
import {IHistoryProvider} from "../history/provider.js";
import {validateBenchmark} from "../history/schema.js";

enum CompareWithType {
  latestCommitInBranch = "latestCommitInBranch",
  exactCommit = "exactCommit",
}

export type CompareWith =
  | {type: CompareWithType.latestCommitInBranch; branch: string; before?: string}
  | {type: CompareWithType.exactCommit; commitSha: string};

export async function resolveCompare(provider: IHistoryProvider, opts: Opts): Promise<Benchmark | null> {
  const compareWith = await resolveCompareWith(opts);
  const prevBench = await resolvePrevBenchmark(compareWith, provider);
  if (!prevBench) return null;

  validateBenchmark(prevBench);

  return prevBench;
}

export async function resolvePrevBenchmark(
  compareWith: CompareWith,
  provider: IHistoryProvider
): Promise<Benchmark | null> {
  switch (compareWith.type) {
    case CompareWithType.exactCommit:
      return await provider.readHistoryCommit(compareWith.commitSha);

    case CompareWithType.latestCommitInBranch: {
      // Try first latest commit in branch
      return await provider.readLatestInBranch(compareWith.branch);
    }
  }
}

export function renderCompareWith(compareWith: CompareWith): string {
  switch (compareWith.type) {
    case CompareWithType.exactCommit:
      return `exactCommit ${compareWith.commitSha}`;

    case CompareWithType.latestCommitInBranch: {
      if (compareWith.before) {
        return `latestCommitInBranch '${compareWith.branch}' before commit ${compareWith.before}`;
      } else {
        return `latestCommitInBranch '${compareWith.branch}'`;
      }
    }
  }
}

export async function resolveCompareWith(opts: Opts): Promise<CompareWith> {
  // compare may be a branch or commit
  if (opts.compareBranch) {
    return {type: CompareWithType.latestCommitInBranch, branch: opts.compareBranch};
  }

  if (opts.compareCommit) {
    return {type: CompareWithType.exactCommit, commitSha: opts.compareCommit};
  }

  // In GA CI figure out what to compare against with github actions events
  if (isGaRun()) {
    switch (github.context.eventName) {
      case "pull_request": {
        const eventData = getGithubEventData<GithubActionsEventData["pull_request"]>();
        const baseBranch = eventData.pull_request.base.ref; // base.ref is already parsed
        return {type: CompareWithType.latestCommitInBranch, branch: baseBranch};
      }

      case "push": {
        const eventData = getGithubEventData<GithubActionsEventData["push"]>();
        const branch = parseBranchFromRef(github.context.ref);
        return {type: CompareWithType.latestCommitInBranch, branch: branch, before: eventData.before};
      }

      default:
        throw Error(`event not supported ${github.context.eventName}`);
    }
  }

  // Otherwise compare against the default branch
  const defaultBranch = await getDefaultBranch(opts);
  return {type: CompareWithType.latestCommitInBranch, branch: defaultBranch};
}
