export type BenchmarkResult = {
  id: string;
  averageNs: number;
  runsDone: number;
  totalMs: number;
};

export function formatResultRow(
  result: BenchmarkResult,
  prevResult: BenchmarkResult | null,
  threshold: number
): string {
  const {id, averageNs, runsDone, totalMs} = result;

  const precision = 7;
  const idLen = 64;

  const opsPerSec = 1e9 / averageNs;

  // ================================================================================================================
  // Scalar multiplication G1 (255-bit, constant-time)                              7219.330 ops/s       138517 ns/op
  // Scalar multiplication G2 (255-bit, constant-time)                              3133.117 ops/s       319171 ns/op

  const [averageTime, timeUnit] = prettyTime(averageNs);
  const row = [
    `${opsPerSec.toPrecision(precision).padStart(11)} ops/s`,
    `${averageTime.toPrecision(precision).padStart(11)} ${timeUnit}/op`,
    getRatioRow(result, prevResult, threshold),
    `${String(runsDone).padStart(10)} runs`,
    `${(totalMs / 1000).toPrecision(3).padStart(6)} s`,
  ].join(" ");

  return id.slice(0, idLen).padEnd(idLen) + " " + row;
}

function getRatioRow(result: BenchmarkResult, prevResult: BenchmarkResult | null, threshold: number): string {
  if (prevResult === null) {
    return "-".padStart(8);
  }

  const ratio = result.averageNs / prevResult.averageNs;

  const str = `x${ratio.toFixed(3)}`.padStart(8);

  if (ratio > threshold) {
    return `\u001b[91m${str}\u001b[0m`; // red
  } else if (ratio < 1 / threshold) {
    return `\u001b[92m${str}\u001b[0m`; // green
  } else {
    return str;
  }
}

function prettyTime(nanoSec: number): [number, string] {
  if (nanoSec > 1e9) return [nanoSec / 1e9, " s"];
  if (nanoSec > 1e6) return [nanoSec / 1e6, "ms"];
  if (nanoSec > 1e3) return [nanoSec / 1e3, "us"];
  return [nanoSec, "ns"];
}
