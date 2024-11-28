import fs from "node:fs";
import path from "node:path";
import {BenchmarkOpts} from "../types.js";
import {optsByRootSuite, optsMap, resultsByRootSuite} from "./globalState.js";
import {BenchmarkRunOptsWithFn, runBenchFn} from "./runBenchFn.js";
import {getRootSuite, getParentSuite} from "./utils.js";

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

const itBenchFn: ItBenchFn = function itBench<T, T2>(
  idOrOpts: string | PartialBy<BenchmarkRunOptsWithFn<T, T2>, "fn">,
  fn?: (arg: T) => void | Promise<void>
): void {
  // TODO:
  // Implement reporter
  // Implement grouping functionality

  // if (this.averageNs === null) this.averageNs = result.averageNs;
  // result.factor = result.averageNs / this.averageNs;

  let opts = coerceToOptsObj(idOrOpts, fn);

  // Apply mocha it opts
  const itFn = opts.only ? it.only : opts.skip ? it.skip : it;

  itFn(opts.id, async function () {
    const parent = getParentSuite(this);
    const optsParent = getOptsFromParent(parent);

    // Get results array from root suite
    const rootSuite = getRootSuite(parent);
    const results = resultsByRootSuite.get(rootSuite);
    const rootOpts = optsByRootSuite.get(rootSuite);
    if (!results || !rootOpts) throw Error("root suite not found");

    opts = Object.assign({}, rootOpts, optsParent, opts);

    // Ensure bench id is unique
    if (results.has(opts.id)) {
      throw Error(`test titles must be unique, duplicated: '${opts.id}'`);
    }

    // Extend timeout if maxMs is set
    if (opts.timeoutBench !== undefined) {
      this.timeout(opts.timeoutBench);
    } else {
      const timeout = this.timeout();
      if (opts.maxMs && opts.maxMs > timeout) {
        this.timeout(opts.maxMs * 1.5);
      } else if (opts.minMs && opts.minMs > timeout) {
        this.timeout(opts.minMs * 1.5);
      }
    }

    // Persist full results if requested. dir is created in `beforeAll`
    const benchmarkResultsCsvDir = process.env.BENCHMARK_RESULTS_CSV_DIR;
    const persistRunsNs = Boolean(benchmarkResultsCsvDir);

    const {result, runsNs} = await runBenchFn(opts, persistRunsNs);

    // Store result for:
    // - to persist benchmark data latter
    // - to render with the custom reporter
    results.set(opts.id, result);

    if (benchmarkResultsCsvDir) {
      fs.mkdirSync(benchmarkResultsCsvDir, {recursive: true});
      const filename = `${result.id}.csv`;
      const filepath = path.join(benchmarkResultsCsvDir, filename);
      fs.writeFileSync(filepath, runsNs.join("\n"));
    }
  });
};

interface ItBenchFn {
  <T, T2>(opts: BenchmarkRunOptsWithFn<T, T2>): void;
  <T, T2>(idOrOpts: string | Omit<BenchmarkRunOptsWithFn<T, T2>, "fn">, fn: (arg: T) => void): void;
  <T, T2>(
    idOrOpts: string | PartialBy<BenchmarkRunOptsWithFn<T, T2>, "fn">,
    fn?: (arg: T) => void | Promise<void>
  ): void;
}

interface ItBench extends ItBenchFn {
  only: ItBenchFn;
  skip: ItBenchFn;
}

export const itBench = itBenchFn as ItBench;

itBench.only = function itBench(idOrOpts, fn): void {
  const opts = coerceToOptsObj(idOrOpts, fn);
  opts.only = true;
  itBenchFn(opts);
} as ItBenchFn;

itBench.skip = function itBench(idOrOpts, fn): void {
  const opts = coerceToOptsObj(idOrOpts, fn);
  opts.skip = true;
  itBenchFn(opts);
} as ItBenchFn;

function coerceToOptsObj<T, T2>(
  idOrOpts: string | PartialBy<BenchmarkRunOptsWithFn<T, T2>, "fn">,
  fn?: (arg: T) => void | Promise<void>
): BenchmarkRunOptsWithFn<T, T2> {
  let opts: BenchmarkRunOptsWithFn<T, T2>;

  if (typeof idOrOpts === "string") {
    if (!fn) throw Error("fn arg must be set");
    opts = {id: idOrOpts, fn};
  } else {
    if (fn) {
      opts = {...idOrOpts, fn};
    } else {
      const optsWithFn = idOrOpts as BenchmarkRunOptsWithFn<T, T2>;
      if (!optsWithFn.fn) throw Error("opts.fn arg must be set");
      opts = optsWithFn;
    }
  }

  return opts;
}

/**
 * Customize benchmark opts for a describe block. Affects only tests within that Mocha.Suite
 * ```ts
 * describe("suite A1", function () {
 *   setBenchOpts({runs: 100});
 *   // 100 runs
 *   itBench("bench A1.1", function() {});
 *   itBench("bench A1.2", function() {});
 *   // 300 runs
 *   itBench({id: "bench A1.3", runs: 300}, function() {});
 *
 *   // Supports nesting, child has priority over parent.
 *   // Arrow functions can be used, won't break it.
 *   describe("suite A2", () => {
 *     setBenchOpts({runs: 200});
 *     // 200 runs.
 *     itBench("bench A2.1", () => {});
 *   })
 * })
 * ```
 */
export function setBenchOpts(opts: BenchmarkOpts): void {
  before(function () {
    if (this.currentTest?.parent) {
      optsMap.set(this.currentTest?.parent, opts);
    }
  });

  after(function () {
    // Clean-up to allow garbage collection
    if (this.currentTest?.parent) {
      optsMap.delete(this.currentTest?.parent);
    }
  });
}

function getOptsFromParent(parent: Mocha.Suite): BenchmarkOpts {
  const optsArr: BenchmarkOpts[] = [];
  getOptsFromSuite(parent, optsArr);
  // Merge opts, highest parent = lowest priority
  return Object.assign({}, ...optsArr.reverse()) as BenchmarkOpts;
}

/**
 * Recursively append suite opts from child to parent.
 *
 * @returns `[suiteChildOpts, suiteParentOpts, suiteParentParentOpts]`
 */
function getOptsFromSuite(suite: Mocha.Suite, optsArr: BenchmarkOpts[]): void {
  const suiteOpts = optsMap.get(suite);
  if (suiteOpts) {
    optsArr.push(suiteOpts);
  }

  if (suite.parent) {
    getOptsFromSuite(suite.parent, optsArr);
  }
}
