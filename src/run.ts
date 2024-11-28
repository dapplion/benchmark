import * as github from "@actions/github";
import {getHistoryProvider} from "./history/index.js";
import {resolveShouldPersist} from "./history/shouldPersist.js";
import {validateBenchmark} from "./history/schema.js";
import {Benchmark, BenchmarkOpts, Opts} from "./types.js";
import {renderCompareWith, resolveCompareWith, resolvePrevBenchmark} from "./compare/index.js";
import {parseBranchFromRef, getCurrentCommitInfo, shell, getCurrentBranch} from "./utils/index.js";
import {runMochaBenchmark} from "./mochaPlugin/mochaRunner.js";
import {computeBenchComparision} from "./compare/compute.js";
import {postGaComment} from "./github/comment.js";
import {isGaRun} from "./github/context.js";

/* eslint-disable no-console */

export async function run(opts: Opts & BenchmarkOpts): Promise<void> {
  // Sanitize opts
  if (isNaN(opts.threshold)) throw Error("opts.threshold is not a number");

  // Retrieve history
  const historyProvider = getHistoryProvider(opts);
  console.log(`Connected to historyProvider: ${historyProvider.providerInfo()}`);

  // Select prev benchmark to compare against
  const compareWith = await resolveCompareWith(opts);
  const prevBench = await resolvePrevBenchmark(compareWith, historyProvider);
  if (prevBench) {
    console.log(`Found previous benchmark for ${renderCompareWith(compareWith)}, at commit ${prevBench.commitSha}`);
    validateBenchmark(prevBench);
  } else {
    console.log(`No previous bencharmk found for ${renderCompareWith(compareWith)}`);
  }

  // TODO: Forward all options to mocha
  // Run benchmarks with mocha programatically
  const results = await runMochaBenchmark(opts, prevBench);
  if (results.length === 0) {
    throw Error("No benchmark result was produced");
  }

  const currentCommit = await getCurrentCommitInfo();
  const currBench: Benchmark = {
    commitSha: currentCommit.commitSha,
    results,
  };

  // Persist new benchmark data
  const currentBranch = await getCurrentBranch();
  const shouldPersist = await resolveShouldPersist(opts, currentBranch);
  if (shouldPersist === true) {
    const refStr = github.context.ref || (await shell("git symbolic-ref HEAD"));
    const branch = parseBranchFromRef(refStr);
    console.log(`Persisting new benchmark data for branch '${branch}' commit '${currBench.commitSha}'`);
    // TODO: prune and limit total entries
    // appendBenchmarkToHistoryAndPrune(history, currBench, branch, opts);
    await historyProvider.writeLatestInBranch(branch, currBench);
    await historyProvider.writeToHistory(currBench);
  }

  const resultsComp = computeBenchComparision(currBench, prevBench, opts.threshold);

  if (!opts.skipPostComment && isGaRun()) {
    await postGaComment(resultsComp);
  }

  if (resultsComp.someFailed && !opts.noThrow) {
    throw Error("Performance regression");
  }
}
