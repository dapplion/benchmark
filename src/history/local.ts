import fs from "node:fs";
import path from "node:path";
import {HistoryProviderType, IHistoryProvider} from "./provider.js";
import {Benchmark, BenchmarkResults} from "../types.js";
import {fromCsv, toCsv} from "../utils/file.js";
import {FsError} from "../utils/index.js";

const extension = ".csv";
const historyDir = "history";
const latestDir = "latest";

interface CsvMeta {
  commit: string;
}

/**
 * Persist results in CSV, one benchmark result per file
 *
 * ```
 * /$dirpath/
 *   history/
 *     52b8122daa9b7a3d0ea0ecfc1ff9eda79a201eb8.csv
 *     c0203c527c9a2269f1f289fad2c8e25afdc2c169.csv
 *   latest/
 *     main.csv
 *     dev.csv
 * ```
 *
 * ```csv
 * id,averageNs,runsDone,totalMs
 * sum array with raw for loop,1348118,371,501
 * sum array with reduce,16896469,128,2163
 * ```
 */
export class LocalHistoryProvider implements IHistoryProvider {
  readonly type: HistoryProviderType = HistoryProviderType.Local;
  constructor(private readonly dirpath: string) {}

  providerInfo(): string {
    return `LocalHistoryProvider, dirpath ${this.dirpath}`;
  }

  async readLatestInBranch(branch: string): Promise<Benchmark | null> {
    const filepath = this.getLatestInBranchFilepath(branch);
    return this.readBenchFileIfExists(filepath);
  }

  async writeLatestInBranch(branch: string, benchmark: Benchmark): Promise<void> {
    const filepath = this.getLatestInBranchFilepath(branch);
    this.writeBenchFile(filepath, benchmark);
  }

  async readHistory(): Promise<Benchmark[]> {
    const historyDirpath = this.getHistoryDirpath();
    let files: string[];
    try {
      files = fs.readdirSync(historyDirpath);
    } catch (e) {
      if ((e as FsError).code === "ENOENT") return [];
      else throw e;
    }

    return files.map((file) => this.readBenchFile(path.join(historyDirpath, file)));
  }

  async readHistoryCommit(commitSha: string): Promise<Benchmark | null> {
    const filepath = this.getHistoryCommitPath(commitSha);
    return this.readBenchFileIfExists(filepath);
  }

  async writeToHistory(benchmark: Benchmark): Promise<void> {
    const filepath = this.getHistoryCommitPath(benchmark.commitSha);
    this.writeBenchFile(filepath, benchmark);
  }

  private readBenchFileIfExists(filepath: string): Benchmark | null {
    try {
      return this.readBenchFile(filepath);
    } catch (e) {
      if ((e as FsError).code === "ENOENT") return null;
      else throw e;
    }
  }

  /** Read result from CSV + metadata as Embedded Metadata */
  private readBenchFile(filepath: string): Benchmark {
    const str = fs.readFileSync(filepath, "utf8");
    const {data, metadata} = fromCsv<BenchmarkResults>(str);
    const csvMeta = metadata as unknown as CsvMeta;
    return {commitSha: csvMeta.commit, results: data};
  }

  /** Write result to CSV + metadata as Embedded Metadata */
  private writeBenchFile(filepath: string, benchmark: Benchmark): void {
    const csvMeta: CsvMeta = {commit: benchmark.commitSha};
    const str = toCsv(benchmark.results, csvMeta as unknown as Record<string, string>);

    fs.mkdirSync(path.dirname(filepath), {recursive: true});
    fs.writeFileSync(filepath, str);
  }

  private getLatestInBranchFilepath(branch: string): string {
    return path.join(this.dirpath, latestDir, branch) + extension;
  }

  private getHistoryCommitPath(commitSha: string): string {
    return path.join(this.getHistoryDirpath(), commitSha) + extension;
  }

  private getHistoryDirpath(): string {
    return path.join(this.dirpath, historyDir);
  }
}
