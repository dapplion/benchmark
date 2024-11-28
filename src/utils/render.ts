import {BenchmarkComparision, ResultComparision} from "../types.js";

type CommitsSha = Pick<BenchmarkComparision, "currCommitSha" | "prevCommitSha">;

export function renderComment(benchComp: BenchmarkComparision): string {
  const isFailedResults = benchComp.results.filter((r) => r.isFailed);
  const isImprovedResults = benchComp.results.filter((r) => r.isImproved);

  let body = benchComp.someFailed
    ? // If there was any bad benchmark print a table only with the bad results
      `## :warning: **Performance Alert** :warning:

Possible performance regression was detected for some benchmarks.
Benchmark result of this commit is worse than the previous benchmark result exceeding threshold.
  
${renderBenchmarkTable(isFailedResults, benchComp)}
`
    : // Otherwise, just add a title
      `## Performance Report

✔️ no performance regression detected      

`;

  if (isImprovedResults.length > 0) {
    body += `
  
🚀🚀 Significant benchmark improvement detected

${renderBenchmarkTable(isImprovedResults, benchComp)}
`;
  }

  // For all cases attach the full benchmarks
  return `${body}

<details><summary>Full benchmark results</summary>

${renderBenchmarkTable(benchComp.results, benchComp)}

</details>
`;
}

function renderBenchmarkTable(benchComp: ResultComparision[], {currCommitSha, prevCommitSha}: CommitsSha): string {
  function toRow(arr: (number | string)[]): string {
    // Don't surround string items with \`, it doesn't look great rendered in Github comments
    const row = arr.map((e) => `${e}`).join(" | ");
    return `| ${row} |`;
  }

  const rows = benchComp.map((result) => {
    const {id, prevAverageNs, currAverageNs, ratio} = result;

    if (prevAverageNs != undefined && ratio != undefined) {
      return toRow([id, prettyTimeStr(currAverageNs), prettyTimeStr(prevAverageNs), ratio.toFixed(2)]);
    } else {
      return toRow([id, prettyTimeStr(currAverageNs)]);
    }
  });

  return `| Benchmark suite | Current: ${currCommitSha} | Previous: ${prevCommitSha ?? "-"} | Ratio |
|-|-|-|-|
${rows.join("\n")}
`;
}

function prettyTimeStr(nanoSec: number): string {
  const [value, unit] = prettyTime(nanoSec);
  return `${value.toPrecision(5)} ${unit}/op`;
}

function prettyTime(nanoSec: number): [number, string] {
  if (nanoSec > 1e9) return [nanoSec / 1e9, " s"];
  if (nanoSec > 1e6) return [nanoSec / 1e6, "ms"];
  if (nanoSec > 1e3) return [nanoSec / 1e3, "us"];
  return [nanoSec, "ns"];
}
