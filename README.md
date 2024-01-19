# Benchmark

Ensures that new code does not introduce performance regressions with CI. Tracks:

- Do PR against the base branch include a performance regression?
- Do new commits in the main branch include a performance regression?

This tooling provides both a easy to use runner for benchmarking and easy integrations to persist past benchmark data.

## Quick start

Create a test mocha test file but use `itBench` instead of `it`

```ts
import {itBench, setBenchOpts} from "../../src";

describe("Sum array benchmark", () => {
  itBench("sum array with reduce", () => {
    arr.reduce((total, curr) => total + curr, 0);
  });
});
```

Then run the CLI, compatible with all mocha options.

```
benchmark 'test/perf/**/*.perf.ts' --local
```

Inspect benchmark results in the terminal

```
  Sum array benchmark
    ✔ sum array with reduce                                               826.0701 ops/s    1.210551 ms/op   x0.993        578 runs   1.21 s
```

## How does it work?

This tool is a CLI wrapper around mocha, example usage:

```
benchmark 'test/perf/**/*.perf.ts' --s3
```

The above command will:

- Read benchmark history from the specified provider (AWS S3)
- Figure out the prev benchmark based on your option (defaults to latest commit in main branch)
- Run benchmark comparing with previous
  - Runs mocha programatically against the file globs
  - Collect benchmark data in-memory while streaming results with a familiar mocha reporter
  - Note: also runs any test that would regularly be run with mocha
- Add result to benchmark history and persist them to the specified provider (AWS S3)
- If in CI, post a PR or commit comment with an expandable summary of the benchmark results comparision
- If a performance regression was detected, exit 1

### Track performance in CI

Below is a suggested Github action to run this tool with s3 history provider:

```yaml
name: Benchmark
# Ensure a single benchmark is run at a time
concurrency: cd-benchmark-${{ github.ref }}

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  s3:
    if: always()
    runs-on: ubuntu-latest
    # Ensure both don't run at the same time
    needs:
      - local
      # - ga-cache

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2-beta
      - run: yarn install --frozen-lockfile

      # Run benchmark with custom tooling and stores the output to a file
      - name: Run performance tests
        run: yarn benchmark --s3
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # S3 credentials
          S3_ACCESS_KEY: ${{ secrets.S3_ACCESS_KEY }}
          S3_SECRET_KEY: ${{ secrets.S3_SECRET_KEY }}
          S3_REGION: ${{ secrets.S3_REGION }}
          S3_BUCKET: ${{ secrets.S3_BUCKET }}
          S3_ENDPOINT: ${{ secrets.S3_ENDPOINT }}
          # Key prefix to separate benchmark data from multiple repositories
          S3_KEY_PREFIX: ${{ github.repository }}/${{ runner.os }}
```

### Track performance locally

When working on optimizing a function you may want to know if your code is actually faster than the previous implementation.

To do that you can keep a benchmark history file locally and run the benchmark first against previous code

```
git checkout master
benchmark test/perf/func.perf.ts --local
```

- Runs benchmark without comparing with previous
- Writes single benchmark data to `./benchmark_data`

Then measure performance with the new code

```
git checkout fix1
benchmark test/perf/func.perf.ts --local
```

- Reads single benchmark data from `./benchmark_data`
- Run benchmark comparing with prev
- Does not write benchmark data

## Config

<!-- Auto-generated options START -->

### `--defaultBranch`

Provide the default branch of this repository to prevent fetching from Github

- type: string
- default:

### `--persistBranches`

Choose what branches to persist benchmark data

- type: array
- default: default-branch

### `--benchmarksPerBranch`

Limit number of benchmarks persisted per branch

- type: number
- default: Infinity

### `--threshold`

Ratio of new average time per run vs previos time per run to consider a failure. Set to 'Infinity' to disable it.

- type: number
- default: 2

### `--compareBranch`

Compare new benchmark data against the latest available benchmark in this branch

- type: string
- default: default-branch

### `--compareCommit`

Compare new benchmark data against the benchmark data associated with a specific commit

- type: string
- default:

### `--prune`

When persisting history, delete benchmark data associated with commits that are no longer in the current git history

- type: boolean
- default:

### `--persist`

Force persisting benchmark data in history

- type: boolean
- default:

### `--noThrow`

Exit cleanly even if a preformance regression was found

- type: boolean
- default:

### `--historyLocal`, `--local`

Persist benchmark history locally. May specify just a boolean to use a default path, or provide a path

- type: string
- default: ./benchmark_data

### `--historyGaCache`, `--ga-cache`

Persist benchmark history in Github Actions cache. Requires Github authentication. May specify just a boolean to use a default cache key or provide a custom key

- type: string
- default: benchmark_data

### `--historyS3`, `--s3`

Persist benchmark history in an Amazon S3 bucket. Requires Github authentication. Must pass AWS credentials via environment variables (S3_ACCESS_KEY, S3_SECRET_KEY) or can set AWS_PROFILE to pull from the shared INI credentials file.

- type: string
- default:

<!-- Auto-generated options END -->

## Roadmap

### Compare performance

```
bench compare --from <branch-name | commit-hash> --to <branch-name | commit-hash>
```

- Retrieves benchmark history
- Don't run benchmark
- Print comparision of from benchmark with to benchmark

### Add more providers

- Github actions cache: Doesn't work due to Github's limitations
- Commited in the repository (gh-pages, or data branch)
