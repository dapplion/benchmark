import fs from "node:fs";
import * as cache from "@actions/cache";
import {Benchmark} from "../types.js";
import {LocalHistoryProvider} from "./local.js";
import {HistoryProviderType, IHistoryProvider} from "./provider.js";

/**
 * Persist results in CSV, one benchmark result per file
 *
 * ```
 * /$dirpath/52b8122daa9b7a3d0ea0ecfc1ff9eda79a201eb8.csv
 * ```
 *
 * ```csv
 * id,averageNs,runsDone,totalMs
 * sum array with raw for loop,1348118,371,501
 * sum array with reduce,16896469,128,2163
 * ```
 */
export function getGaCacheHistoryProvider(cacheKey: string): IHistoryProvider {
  const tmpDir = fs.mkdtempSync("ga-cache-download");
  return new GaCacheHistoryProvider(tmpDir, cacheKey);
}

class GaCacheHistoryProvider extends LocalHistoryProvider implements IHistoryProvider {
  readonly type = HistoryProviderType.GaCache;
  private initializePromise: Promise<unknown> | null = null;

  constructor(
    private readonly tmpDir: string,
    private readonly cacheKey: string
  ) {
    super(tmpDir);
  }

  providerInfo(): string {
    return `GaCacheHistoryProvider: cacheKey ${this.cacheKey}`;
  }

  async readLatestInBranch(branch: string): Promise<Benchmark | null> {
    await this.initialize();
    return super.readLatestInBranch(branch);
  }

  async writeLatestInBranch(branch: string, benchmark: Benchmark): Promise<void> {
    await super.writeLatestInBranch(branch, benchmark);
    await this.persist();
  }

  async readHistory(): Promise<Benchmark[]> {
    await this.initialize();
    return super.readHistory();
  }

  async readHistoryCommit(commitSha: string): Promise<Benchmark | null> {
    await this.initialize();
    return super.readHistoryCommit(commitSha);
  }

  async writeToHistory(benchmark: Benchmark): Promise<void> {
    await super.writeToHistory(benchmark);
    await this.persist();
  }

  private async initialize(): Promise<unknown> {
    // eslint-disable-next-line no-console
    console.log("ENV", process.env);
    if (this.initializePromise === null) {
      this.initializePromise = cache.restoreCache([this.tmpDir], this.cacheKey);
    }
    return this.initializePromise;
  }

  private async persist(): Promise<void> {
    await cache.saveCache([this.tmpDir], this.cacheKey);
  }
}
