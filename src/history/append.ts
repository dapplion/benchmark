import {Benchmark, BenchmarkHistory, Opts} from "../types.js";

export function appendBenchmarkToHistoryAndPrune(
  history: BenchmarkHistory,
  newBench: Benchmark,
  branch: string,
  opts: Opts
): void {
  if (opts.benchmarksPerBranch) {
    limitBenchmarksPerBranch(history, opts.benchmarksPerBranch);
  }

  if (opts.prune) {
    // Prune commits not in current git history
    // TODO
  }

  addBenchmarkToHistory(history, newBench, branch);
}

/**
 * Limit num of benchmarks per branch
 */
function limitBenchmarksPerBranch(history: BenchmarkHistory, benchmarksPerBranch: number): void {
  for (const branchBenchmarks of Object.values(history.benchmarks)) {
    const deleteCount = branchBenchmarks.length - benchmarksPerBranch;
    if (deleteCount > 0) {
      branchBenchmarks.splice(0, deleteCount);
    }
  }
}

function addBenchmarkToHistory(history: BenchmarkHistory, newBench: Benchmark, branch: string): void {
  if (history.benchmarks[branch] === undefined) {
    history.benchmarks[branch] = [];
  }

  // Ensure there are no duplicates for the same commit
  history.benchmarks[branch] = history.benchmarks[branch].filter((bench) => {
    if (bench.commitSha === newBench.commitSha) {
      // eslint-disable-next-line no-console
      console.log("Deleting previous benchmark for the same commit");
      return false;
    } else {
      return true;
    }
  });

  history.benchmarks[branch].push(newBench);
}
