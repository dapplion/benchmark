// eslint-disable-next-line import/no-extraneous-dependencies
import Mocha from "mocha";
import {optsByRootSuite, resultsByRootSuite} from "./globalState.js";
import {collectFiles, FileCollectionOptions} from "../utils/mochaCliExports.js";
import {benchmarkReporterWithPrev} from "./reporter.js";
import {Benchmark, BenchmarkOpts, BenchmarkResult, onlyBenchmarkOpts, Opts} from "../types.js";

export async function runMochaBenchmark(
  opts: Opts & BenchmarkOpts,
  prevBench: Benchmark | null
): Promise<BenchmarkResult[]> {
  const mocha = new Mocha({
    // Pass all options to mocha, from upstream CLI
    ...opts,
    reporter: benchmarkReporterWithPrev(prevBench, opts.threshold),
    // rootHooks: {beforeAll},
  });

  // Register mocha root suite to append results on it() blocks
  const results = new Map<string, BenchmarkResult>();
  resultsByRootSuite.set(mocha.suite, results);
  optsByRootSuite.set(mocha.suite, onlyBenchmarkOpts(opts));

  // Recreate `singleRun()` function - https://github.com/mochajs/mocha/blob/dcad90ad6e79864c871e2bc55b22c79ac6952991/lib/cli/run-helpers.js#L120
  const fileCollectParams: FileCollectionOptions = {
    ignore: opts.ignore ?? [],
    extension: opts.extension ?? [],
    file: opts.file ?? [],
    recursive: opts.recursive ?? false,
    sort: opts.sort ?? false,
    spec: opts.spec ?? [],
  };
  const files = collectFiles(fileCollectParams);
  mocha.files = files.files;
  await mocha.loadFilesAsync();

  // Run the tests.
  await new Promise<void>((resolve, reject) => {
    mocha.run(function (failures) {
      // process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
      if (failures > 0) {
        reject(Error("Some tests failed"));
      } else {
        resolve();
      }
    });
  });

  return Array.from(results.values());
}
