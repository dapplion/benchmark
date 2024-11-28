import {BenchmarkResult, BenchmarkOpts} from "../types.js";

export type BenchmarkRunOpts = BenchmarkOpts & {
  id: string;
};

export type BenchmarkRunOptsWithFn<T, T2> = BenchmarkOpts & {
  id: string;
  fn: (arg: T) => void | Promise<void>;
  before?: () => T2 | Promise<T2>;
  beforeEach?: (arg: T2, i: number) => T | Promise<T>;
};

export async function runBenchFn<T, T2>(
  opts: BenchmarkRunOptsWithFn<T, T2>,
  persistRunsNs?: boolean
): Promise<{result: BenchmarkResult; runsNs: bigint[]}> {
  const minRuns = opts.minRuns || 1;
  const maxRuns = opts.maxRuns || Infinity;
  const maxMs = opts.maxMs || Infinity;
  const minMs = opts.minMs || 100;
  const maxWarmUpMs = opts.maxWarmUpMs !== undefined ? opts.maxWarmUpMs : 500;
  const maxWarmUpRuns = opts.maxWarmUpRuns !== undefined ? opts.maxWarmUpRuns : 1000;
  // Ratio of maxMs that the warmup is allow to take from ellapsedMs
  const maxWarmUpRatio = 0.5;
  const convergeFactor = opts.convergeFactor || 0.5 / 100; // 0.5%
  const runsFactor = opts.runsFactor || 1;
  const maxWarmUpNs = BigInt(maxWarmUpMs) * BigInt(1e6);
  const sampleEveryMs = 100;

  const runsNs: bigint[] = [];
  const startRunMs = Date.now();

  let runIdx = 0;
  let totalNs = BigInt(0);
  let totalWarmUpNs = BigInt(0);
  let totalWarmUpRuns = 0;
  let prevAvg0 = 0;
  let prevAvg1 = 0;
  let lastConvergenceSample = startRunMs;
  let isWarmUp = maxWarmUpNs > 0 && maxWarmUpRuns > 0;

  const inputAll = opts.before ? await opts.before() : (undefined as unknown as T2);

  while (true) {
    const ellapsedMs = Date.now() - startRunMs;
    const mustStop = ellapsedMs >= maxMs || runIdx >= maxRuns;
    const mayStop = ellapsedMs > minMs && runIdx > minRuns;
    // Exceeds limits, must stop now
    if (mustStop) {
      break;
    }

    const input = opts.beforeEach ? await opts.beforeEach(inputAll, runIdx) : (undefined as unknown as T);

    const startNs = process.hrtime.bigint();
    await opts.fn(input);
    const endNs = process.hrtime.bigint();

    const runNs = endNs - startNs;

    // Useful when the event loop needs to tick to free resources created by fn()
    if (opts.yieldEventLoopAfterEach) {
      await new Promise((r) => setTimeout(r, 0));
    }

    if (isWarmUp) {
      // Warm-up, do not count towards results
      totalWarmUpRuns += 1;
      totalWarmUpNs += runNs;

      // On any warm-up finish condition, mark isWarmUp = true to prevent having to check them again
      if (totalWarmUpNs >= maxWarmUpNs || totalWarmUpRuns >= maxWarmUpRuns || ellapsedMs / maxMs >= maxWarmUpRatio) {
        isWarmUp = false;
      }
    } else {
      // Persist results
      runIdx += 1;
      totalNs += runNs;
      // If the caller wants the exact times of all runs, persist them
      if (persistRunsNs) runsNs.push(runNs);

      // When is a good time to stop a benchmark? A naive answer is after N miliseconds or M runs.
      // This code aims to stop the benchmark when the average fn run time has converged at a value
      // within a given convergence factor. To prevent doing expensive math to often for fast fn,
      // it only takes samples every `sampleEveryMs`. It stores two past values to be able to compute
      // a very rough linear and quadratic convergence.
      if (Date.now() - lastConvergenceSample > sampleEveryMs) {
        lastConvergenceSample = Date.now();
        const avg = Number(totalNs / BigInt(runIdx));

        // Compute convergence (1st order + 2nd order)
        const a = prevAvg0;
        const b = prevAvg1;
        const c = avg;

        // Only do convergence math if it may stop
        if (mayStop) {
          // Aprox linear convergence
          const convergence1 = Math.abs(c - a);
          // Aprox quadratic convergence
          const convergence2 = Math.abs(b - (a + c) / 2);
          // Take the greater of both to enfore linear and quadratic are below convergeFactor
          const convergence = Math.max(convergence1, convergence2) / a;

          // Okay to stop + has converged, stop now
          if (convergence < convergeFactor) {
            break;
          }
        }

        prevAvg0 = prevAvg1;
        prevAvg1 = avg;
      }
    }
  }

  if (runIdx === 0) {
    // Try to guess what happened
    if (totalWarmUpRuns > 0) {
      throw Error(
        `
No run was completed before 'maxMs' ${maxMs}, but did ${totalWarmUpRuns} warm-up runs.
Consider adjusting 'maxWarmUpMs' or 'maxWarmUpRuns' options orextend 'maxMs'
if your function is very slow.
`.trim()
      );
    } else {
      throw Error(
        `
No run was completed before 'maxMs' ${maxMs}. Consider extending the 'maxMs' time if
either the before(), beforeEach() or fn() functions are too slow.
`.trim()
      );
    }
  }

  const averageNs = Number(totalNs / BigInt(runIdx)) / runsFactor;

  return {
    result: {
      id: opts.id,
      averageNs,
      runsDone: runIdx,
      totalMs: Date.now() - startRunMs,
      threshold: opts.noThreshold === true ? Infinity : opts.threshold,
    },
    runsNs,
  };
}
