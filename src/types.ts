import {FileCollectionOptions} from "./utils/mochaCliExports";

export type Opts = Partial<FileCollectionOptions> & {
  defaultBranch?: string;
  persistBranches?: string[];
  benchmarksPerBranch?: number;
  threshold: number;
  compareBranch?: string;
  compareCommit?: string;
  prune?: boolean;
  persist?: boolean;
  noThrow?: boolean;
  historyLocal?: string | boolean;
  historyGaCache?: string | boolean;
  historyS3?: boolean;
};

export type BenchmarkOpts = {
  /** Max number of fn() runs, after which the benchmark stops */
  maxRuns?: number;
  /** Min number of fn() runs before considering stopping the benchmark after converging */
  minRuns?: number;
  /** Max total miliseconds of runs, after which the benchmark stops */
  maxMs?: number;
  /** Min total miiliseconds of runs before considering stopping the benchmark after converging */
  minMs?: number;
  /**
   * Maximum real benchmark function run time before starting to count towards results. Set to 0 to not warm-up.
   * May warm up for less ms if the `maxWarmUpRuns` condition is met first.
   */
  maxWarmUpMs?: number;
  /**
   * Maximum benchmark function runs before starting to count towards results. Set to 0 to not warm-up.
   * May warm up for less ms if the `maxWarmUpMs` condition is met first.
   */
  maxWarmUpRuns?: number;
  /** Convergance factor (0,1) at which the benchmark automatically stops. Set to 1 to disable */
  convergeFactor?: number;
  /** If fn() contains a foor loop repeating a task N times, you may set runsFactor = N to scale down the results. */
  runsFactor?: number;
  /** Run `sleep(0)` after each fn() call. Use when the event loop needs to tick to free resources created by fn() */
  yieldEventLoopAfterEach?: boolean;
  /** Hard timeout, enforced by mocha. */
  // NOTE: Must not use `.timeout` or it collisions with mocha's .timeout option. It defaults to 2000 and messed up everything
  timeoutBench?: number;
  // For reporter
  /** Customize the threshold for this specific benchmark. Set to Infinity to disable it */
  threshold?: number;
  /** Equivalent to setting threshold = Infinity */
  noThreshold?: boolean;

  // For mocha
  only?: boolean;
  skip?: boolean;
};

/** Manual lodash.pick() function. Ensure no unwanted options end up in optsByRootSuite */
export function onlyBenchmarkOpts(opts: BenchmarkOpts): BenchmarkOpts {
  // Define in this way so Typescript guarantees all keys are considered
  const keysObj: Record<keyof BenchmarkOpts, true> = {
    maxRuns: true,
    minRuns: true,
    maxMs: true,
    minMs: true,
    maxWarmUpMs: true,
    maxWarmUpRuns: true,
    convergeFactor: true,
    runsFactor: true,
    yieldEventLoopAfterEach: true,
    timeoutBench: true,
    threshold: true,
    noThreshold: true,
    only: true,
    skip: true,
  };

  const optsOut = {} as Record<keyof BenchmarkOpts, BenchmarkOpts[keyof BenchmarkOpts]>;
  for (const key of Object.keys(keysObj) as (keyof BenchmarkOpts)[]) {
    if (opts[key] !== undefined) {
      optsOut[key] = opts[key];
    }
  }
  return optsOut as BenchmarkOpts;
}

export type BenchmarkResults = BenchmarkResult[];

/** Time results for a single benchmark item */
export type BenchmarkResult = {
  id: string;
  averageNs: number;
  runsDone: number;
  totalMs: number;
  // For reporter
  threshold: number | undefined;
};

/** Time results for a single benchmark (all items) */
export type Benchmark = {
  commitSha: string;
  results: BenchmarkResults;
};

/** All benchmarks organized by branch */
export type BenchmarkHistory = {
  benchmarks: {
    [branch: string]: Benchmark[];
  };
};

export type BenchmarkComparision = {
  currCommitSha: string;
  prevCommitSha: string | null;
  someFailed: boolean;
  results: ResultComparision[];
};

export type ResultComparision = {
  id: string;
  currAverageNs: number;
  prevAverageNs: number | null;
  ratio: number | null;
  isFailed: boolean;
  isImproved: boolean;
};
