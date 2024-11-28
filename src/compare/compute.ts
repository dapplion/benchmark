import {ResultComparision, BenchmarkComparision, Benchmark, BenchmarkResult} from "../types.js";

export function computeBenchComparision(
  currBench: Benchmark,
  prevBench: Benchmark | null,
  threshold: number
): BenchmarkComparision {
  const prevResults = new Map<string, BenchmarkResult>();
  if (prevBench) {
    for (const bench of prevBench.results) {
      prevResults.set(bench.id, bench);
    }
  }

  const results = currBench.results.map((currBench): ResultComparision => {
    const {id} = currBench;
    const prevBench = prevResults.get(id);
    const thresholdBench = currBench.threshold ?? threshold;

    if (prevBench) {
      const ratio = currBench.averageNs / prevBench.averageNs;
      return {
        id,
        currAverageNs: currBench.averageNs,
        prevAverageNs: prevBench.averageNs,
        ratio,
        isFailed: ratio > thresholdBench,
        isImproved: ratio < 1 / thresholdBench,
      };
    } else {
      return {
        id,
        currAverageNs: currBench.averageNs,
        prevAverageNs: null,
        ratio: null,
        isFailed: false,
        isImproved: false,
      };
    }
  });

  return {
    currCommitSha: currBench.commitSha,
    prevCommitSha: prevBench?.commitSha ?? null,
    someFailed: results.some((r) => r.isFailed),
    results,
  };
}
