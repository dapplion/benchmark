// Must not use `* as yargs`, see https://github.com/yargs/yargs/issues/1131
import yargs from "yargs";
import {loadOptions, handleRequires} from "./utils/mochaCliExports.js";
import {options, optionsDefault} from "./options.js";
import {run} from "./run.js";
import {Opts} from "./types.js";

/**
 * Common factory for running the CLI and running integration tests
 * The CLI must actually be executed in a different script
 */
const argv = process.argv.slice(2);

const args = loadOptions(argv);

void yargs()
  .env("BENCHMARK")
  .scriptName("benchmark")
  .command({
    command: ["$0 [spec..]", "inspect"],
    describe: "Run benchmarks",
    handler: async (argv) => {
      // Copied from mocha source to load ts-node properly.
      // It's on the CLI middleware of mocha so it does not get run when calling mocha programatically
      // https://github.com/mochajs/mocha/blob/014e47a8b07809e73b1598c7abeafe7a3b57a8f7/lib/cli/run.js#L353
      const plugins = await handleRequires(argv.require as string[]);
      Object.assign(argv, plugins);

      await run({threshold: optionsDefault.threshold, ...argv} as Opts);
    },
  })

  .parserConfiguration({
    // As of yargs v16.1.0 dot-notation breaks strictOptions()
    // Manually processing options is typesafe tho more verbose
    "dot-notation": false,
    // From mocha
    "combine-arrays": true,
    "short-option-groups": false,
    "strip-aliased": true,
  })
  .options(options)
  .usage(
    `Benchmark runner to track performance.

  benchmark --local 'test/**/*.perf.ts'
`
  )
  .epilogue("For more information, check the CLI reference _TBD_")
  // DO NOT USE "h", "v" aliases. Those break the --help functionality
  // .alias("h", "help")
  // .alias("v", "version")
  .recommendCommands()
  .fail((msg, err) => {
    if (msg) {
      // Show command help message when no command is provided
      if (msg.includes("Not enough non-option arguments")) {
        yargs.showHelp();
        // eslint-disable-next-line no-console
        console.log("\n");
      }
    }

    const errorMessage = err ? err.stack || err.message : msg || "Unknown error";

    // eslint-disable-next-line no-console
    console.error(` ✖ ${errorMessage}\n`);
    process.exit(1);
  })
  .config(args)
  .parse(args._);
