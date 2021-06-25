import fs from "fs";
import path from "path";
import {resultsByRootSuite} from "./globalState";
import {BenchmarkOpts, BenchmarkRunOptsWithFn, runBenchFn} from "./runBenchFn";
import {getRootSuite, getParentSuite} from "./utils";

/**
 * Map to persist options set in describe blocks
 */
const optsMap = new Map<Mocha.Suite, BenchmarkOpts>();

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export function itBench<T>(opts: BenchmarkRunOptsWithFn<T>): void;
export function itBench<T>(idOrOpts: string | Omit<BenchmarkRunOptsWithFn<T>, "fn">, fn: (arg: T) => void): void;
export function itBench<T>(
  idOrOpts: string | PartialBy<BenchmarkRunOptsWithFn<T>, "fn">,
  fn?: (arg: T) => void | Promise<void>
): void {
  // TODO:
  // Implement reporter
  // Implement grouping functionality

  // if (this.averageNs === null) this.averageNs = result.averageNs;
  // result.factor = result.averageNs / this.averageNs;

  let opts: BenchmarkRunOptsWithFn<T>;
  if (typeof idOrOpts === "string") {
    if (!fn) throw Error("fn arg must be set");
    opts = {id: idOrOpts, fn};
  } else {
    if (fn) {
      opts = {...idOrOpts, fn};
    } else {
      const optsWithFn = idOrOpts as BenchmarkRunOptsWithFn<T>;
      if (!optsWithFn.fn) throw Error("opts.fn arg must be set");
      opts = optsWithFn;
    }
  }

  it(opts.id, async function () {
    const parent = getParentSuite(this);
    const optsParent = getOptsFromParent(parent);
    opts = Object.assign({}, optsParent, opts);

    // Get results array from root suite
    const rootSuite = getRootSuite(parent);
    const results = resultsByRootSuite.get(rootSuite);
    if (!results) throw Error("root suite not found");

    // Ensure bench id is unique
    if (results.has(opts.id)) {
      throw Error(`test titles must be unique, duplicated: '${opts.id}'`);
    }

    // Extend timeout if maxMs is set
    const timeout = this.timeout();
    if (opts.maxMs && opts.maxMs > timeout) {
      this.timeout(opts.maxMs * 1.5);
    } else if (opts.minMs && opts.minMs > timeout) {
      this.timeout(opts.minMs * 1.5);
    }

    const {result, runsNs} = await runBenchFn(opts);

    // Store result for:
    // - to persist benchmark data latter
    // - to render with the custom reporter
    results.set(opts.id, result);

    // Persist full results if requested. dir is created in `beforeAll`
    const benchmarkResultsCsvDir = process.env.BENCHMARK_RESULTS_CSV_DIR;
    if (benchmarkResultsCsvDir) {
      fs.mkdirSync(benchmarkResultsCsvDir, {recursive: true});
      const filename = `${result.id}.csv`;
      const filepath = path.join(benchmarkResultsCsvDir, filename);
      fs.writeFileSync(filepath, runsNs.join("\n"));
    }
  });
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
