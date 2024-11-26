import Ajv from "ajv";
import {BenchmarkHistory, Benchmark} from "../types";

export const emptyBenchmarkHistory: BenchmarkHistory = {benchmarks: {}};

const ajv = new Ajv({allErrors: true});

/** TS type `BenchmarkResults` */
const benchmarkResultsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: {type: "string"},
      averageNs: {type: "number"},
      runsDone: {type: "integer"},
      totalMs: {type: "number"},
      factor: {type: "number"},
    },
    required: ["id", "averageNs", "runsDone", "totalMs"],
  },
};

/** TS type `Benchmark` */
const benchmarkSchema = {
  type: "object",
  properties: {
    commitSha: {type: "string"},
    results: benchmarkResultsSchema,
  },
  required: ["commitSha", "results"],
};

/** TS type `BenchmarkHistory` */
const benchmarkHistorySchema = {
  type: "object",
  properties: {
    benchmarks: {
      type: "object",
      patternProperties: {
        "^.*$": {
          type: "array",
          items: benchmarkSchema,
        },
      },
    },
  },
  required: ["benchmarks"],
};

export function validateBenchmark(data: Benchmark): void {
  const validate = ajv.compile(benchmarkSchema);
  const valid = validate(data);
  if (!valid) {
    throw Error(`Invalid BenchmarkResults ${JSON.stringify(validate.errors, null, 2)}`);
  }
}

export function validateHistory(history: BenchmarkHistory): void {
  const validate = ajv.compile(benchmarkHistorySchema);
  const valid = validate(history);
  if (!valid) throw Error(`Invalid BenchmarkHistory ${JSON.stringify(validate.errors, null, 2)}`);
}
