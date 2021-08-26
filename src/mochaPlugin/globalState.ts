import {BenchmarkResult, BenchmarkOpts} from "../types";

/**t
 * Map of results by root suie.
 * Before running mocha, you must register the root suite here
 */
export const resultsByRootSuite = new WeakMap<Mocha.Suite, Map<string, BenchmarkResult>>();

/**
 * Global opts from CLI
 */
export const optsByRootSuite = new WeakMap<Mocha.Suite, BenchmarkOpts>();

/**
 * Map to persist options set in describe blocks
 */
export const optsMap = new Map<Mocha.Suite, BenchmarkOpts>();
