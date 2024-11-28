import {Benchmark} from "../types.js";

export enum HistoryProviderType {
  Local = "Local",
  GaCache = "GaCache",
  S3 = "S3",
}

/**
 * How to organize data?
 * - Most times you want the latest benchmark in a branch:
 *   - When doing PRs against some branch
 *   - When doing commits against main branch
 *
 * Need to persist two concepts
 * - Long term history for ploting
 * - The latest commit in a branch
 *
 * /history
 *   /9f1f289fad2c8e25afdc2c169c0203c527c9a226 = csv with benchmark
 *   /c0203c527c9a2269f1f289fad2c8e25afdc2c169 = csv
 * /latest
 *   /main = csv with benchmark
 *   /dev = csv with benchmark
 *
 * In latest we can track the latest commits of many branches and would allow
 * to do benchmark comparisions on PR from feat1 -> feat2.
 *
 * In history you can ONLY track a single branch, which should be the main branch.
 */
export interface IHistoryProvider {
  readonly type: HistoryProviderType;
  providerInfo(): string;
  readLatestInBranch(branch: string): Promise<Benchmark | null>;
  writeLatestInBranch(branch: string, benchmark: Benchmark): Promise<void>;
  readHistory(): Promise<Benchmark[]>;
  readHistoryCommit(commitSha: string): Promise<Benchmark | null>;
  writeToHistory(data: Benchmark): Promise<void>;
}
