// eslint-disable-next-line import/no-extraneous-dependencies
import Mocha from "mocha";
import {Benchmark, BenchmarkResult} from "../types.js";
import {resultsByRootSuite} from "./globalState.js";
import {formatResultRow} from "./format.js";
import {getRootSuite} from "./utils.js";

const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_TEST_PENDING,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
} = Mocha.Runner.constants;

interface ReporterConstructor {
  new (runner: Mocha.Runner, options: Mocha.MochaOptions): Mocha.reporters.Base;
}

export function benchmarkReporterWithPrev(prevBench: Benchmark | null, threshold: number): ReporterConstructor {
  const prevResults = new Map<string, BenchmarkResult>();
  if (prevBench) {
    for (const bench of prevBench.results) {
      prevResults.set(bench.id, bench);
    }
  }

  return class BenchmarkReporter extends Mocha.reporters.Base {
    constructor(runner: Mocha.Runner, options?: Mocha.MochaOptions) {
      super(runner, options);

      // eslint-disable-next-line no-console
      const consoleLog = console.log;
      const color = Mocha.reporters.Base.color;
      const symbols = Mocha.reporters.Base.symbols;

      let indents = 0;
      let n = 0;

      function indent(): string {
        return Array(indents).join("  ");
      }

      runner.on(EVENT_RUN_BEGIN, function () {
        consoleLog();
      });

      runner.on(EVENT_SUITE_BEGIN, function (suite) {
        ++indents;
        consoleLog(color("suite", "%s%s"), indent(), suite.title);
      });

      runner.on(EVENT_SUITE_END, function () {
        --indents;
        if (indents === 1) {
          consoleLog();
        }
      });

      runner.on(EVENT_TEST_PENDING, function (test) {
        const fmt = indent() + color("pending", "  - %s");
        consoleLog(fmt, test.title);
      });

      runner.on(EVENT_TEST_PASS, function (test) {
        try {
          if (!test.parent) throw Error("test has no parent");
          const rootSuite = getRootSuite(test.parent);
          const results = resultsByRootSuite.get(rootSuite);
          if (!results) throw Error("root suite not found");

          const result = results.get(test.title);
          if (result) {
            // Render benchmark
            const prevResult = prevResults.get(result.id) ?? null;

            const resultRow = formatResultRow(result, prevResult, result.threshold ?? threshold);
            const fmt = indent() + color("checkmark", "  " + symbols.ok) + " " + resultRow;
            consoleLog(fmt);
          } else {
            // Render regular test
            const fmt = indent() + color("checkmark", "  " + symbols.ok) + color("pass", " %s");
            consoleLog(fmt, test.title);
          }
        } catch (e) {
          // Log error manually since mocha doesn't log errors thrown here
          consoleLog(e);
          process.exitCode = 1;
          throw e;
        }
      });

      runner.on(EVENT_TEST_FAIL, function (test) {
        consoleLog(indent() + color("fail", "  %d) %s"), ++n, test.title);
      });

      runner.once(EVENT_RUN_END, this.epilogue.bind(this));
    }
  };
}
