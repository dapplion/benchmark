import {Options} from "yargs";
import {Opts, BenchmarkOpts} from "./types";
import {FileCollectionOptions} from "./utils/mochaCliExports";

export const optionsDefault = {
  threshold: 2,
  historyLocalPath: "./benchmark_data",
  historyCacheKey: "benchmark_data",
};

type ICliCommandOptions<OwnArgs> = Required<{[key in keyof OwnArgs]: Options}>;
type CliOpts = Omit<Opts, "fileGlob" | keyof FileCollectionOptions> &
  Omit<BenchmarkOpts, "only" | "skip" | "noThreshold">;

export const options: ICliCommandOptions<CliOpts> = {
  defaultBranch: {
    description: "Provide the default branch of this repository to prevent fetching from Github",
    type: "string",
    group: "Options:",
  },
  persistBranches: {
    description: "Choose what branches to persist benchmark data",
    type: "array",
    defaultDescription: "default-branch",
  },
  benchmarksPerBranch: {
    description: "Limit number of benchmarks persisted per branch",
    type: "number",
    defaultDescription: "Infinity",
  },
  threshold: {
    description:
      "Ratio of new average time per run vs previos time per run to consider a failure. Set to 'Infinity' to disable it.",
    type: "number",
    default: optionsDefault.threshold,
  },
  compareBranch: {
    description: "Compare new benchmark data against the latest available benchmark in this branch",
    type: "string",
    defaultDescription: "default-branch",
  },
  compareCommit: {
    description: "Compare new benchmark data against the benchmark data associated with a specific commit",
    type: "string",
  },
  prune: {
    description:
      "When persisting history, delete benchmark data associated with commits that are no longer in the current git history",
    type: "boolean",
  },
  persist: {
    description: "Force persisting benchmark data in history",
    type: "boolean",
  },
  noThrow: {
    description: "Exit cleanly even if a preformance regression was found",
    type: "boolean",
  },
  skipPostComment: {
    description: "Skip post Github comment step if run on Github CI",
    type: "boolean",
  },
  historyLocal: {
    alias: ["local"],
    description:
      "Persist benchmark history locally. May specify just a boolean to use a default path, or provide a path",
    type: "string",
    defaultDescription: optionsDefault.historyLocalPath,
  },
  historyGaCache: {
    alias: ["ga-cache"],
    description:
      "Persist benchmark history in Github Actions cache. Requires Github authentication. May specify just a boolean to use a default cache key or provide a custom key",
    type: "string",
    defaultDescription: optionsDefault.historyCacheKey,
  },
  historyS3: {
    alias: ["s3"],
    description: "Persist benchmark history in an Amazon S3 bucket. Requires Github authentication",
    type: "string",
  },

  // BenchmarkOpts

  maxRuns: {
    type: "number",
    description: "Max number of fn() runs, after which the benchmark stops",
    group: "itBench() options",
  },
  minRuns: {
    type: "number",
    description: "Min number of fn() runs before considering stopping the benchmark after converging",
    group: "itBench() options",
  },
  maxMs: {
    type: "number",
    description: "Max total miliseconds of runs, after which the benchmark stops",
    group: "itBench() options",
  },
  minMs: {
    type: "number",
    description: "Min total miiliseconds of runs before considering stopping the benchmark after converging",
    group: "itBench() options",
  },
  maxWarmUpMs: {
    type: "number",
    description:
      "Maximum real benchmark function run time before starting to count towards results. Set to 0 to not warm-up. May warm up for less ms if the `maxWarmUpRuns` condition is met first.",
    group: "itBench() options",
  },
  maxWarmUpRuns: {
    type: "number",
    description:
      "Maximum benchmark function runs before starting to count towards results. Set to 0 to not warm-up. May warm up for less ms if the `maxWarmUpMs` condition is met first.",
    group: "itBench() options",
  },
  convergeFactor: {
    type: "number",
    description: "Convergance factor (0,1) at which the benchmark automatically stops. Set to 1 to disable",
    group: "itBench() options",
  },
  runsFactor: {
    type: "number",
    description:
      "If fn() contains a foor loop repeating a task N times, you may set runsFactor = N to scale down the results.",
    group: "itBench() options",
  },
  yieldEventLoopAfterEach: {
    type: "boolean",
    description:
      "Run `sleep(0)` after each fn() call. Use when the event loop needs to tick to free resources created by fn()",
    group: "itBench() options",
  },
  timeoutBench: {
    type: "number",
    description: "Hard timeout, enforced by mocha.",
    group: "itBench() options",
  },
};
