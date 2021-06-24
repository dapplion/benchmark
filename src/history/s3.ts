import path from "path";
import S3 from "aws-sdk/clients/s3";
import {Benchmark, BenchmarkResults} from "../types";
import {fromCsv, toCsv} from "../utils";
import {HistoryProviderType, IHistoryProvider} from "./provider";

export type S3Config = Pick<S3.Types.ClientConfiguration, "accessKeyId" | "secretAccessKey" | "region" | "endpoint"> & {
  Bucket: string;
};

const historyDir = "history";
const latestDir = "latest";

const MAX_ITEMS_TO_LIST = 100;

interface CsvMeta {
  commit: string;
}

export class S3HistoryProvider implements IHistoryProvider {
  readonly type = HistoryProviderType.S3;
  private s3: S3;

  constructor(private readonly config: S3Config) {
    this.s3 = new S3(config);
  }

  providerInfo() {
    const info = {Bucket: this.config.Bucket, region: this.config.region};
    return `S3HistoryProvider: ${JSON.stringify(info, null, 2)}`;
  }

  /**
   * Automatically loads credentials from ENV
   *
   * Custom ENVs
   *
   * S3_ACCESS_KEY
   * S3_SECRET_KEY
   * S3_REGION (optional)
   * S3_ENDPOINT (optional)
   *
   * AWS ENVs
   *
   * AWS_ACCESS_KEY_ID
   * AWS_SECRET_ACCESS_KEY
   * AWS_SESSION_TOKEN (optional)
   *
   * https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html
   */
  static fromEnv(): S3HistoryProvider {
    const {S3_ACCESS_KEY, S3_SECRET_KEY, S3_REGION, S3_BUCKET, S3_ENDPOINT} = process.env;

    if (!S3_BUCKET) throw Error("No ENV S3_BUCKET");
    // S3_ACCESS_KEY is optional
    // S3_SECRET_KEY is optional
    // S3_REGION is optional
    // S3_ENDPOINT is optional

    return new S3HistoryProvider({
      accessKeyId: ifSet(S3_ACCESS_KEY),
      secretAccessKey: ifSet(S3_SECRET_KEY),
      region: ifSet(S3_REGION),
      Bucket: S3_BUCKET,
      endpoint: ifSet(S3_ENDPOINT),
    });
  }

  async readLatestInBranch(branch: string): Promise<Benchmark | null> {
    const key = this.getLatestInBranchKey(branch);
    return this.readBenchFileIfExists(key);
  }

  async writeLatestInBranch(branch: string, benchmark: Benchmark): Promise<void> {
    const key = this.getLatestInBranchKey(branch);
    this.writeBenchFile(key, benchmark);
  }

  async readHistory(maxItems = MAX_ITEMS_TO_LIST): Promise<Benchmark[]> {
    const objects = await this.s3
      .listObjects({
        Prefix: historyDir,
        Bucket: this.config.Bucket,
        MaxKeys: maxItems,
      })
      .promise()
      .catch((e) => {
        e.message = `Error on listObjects: ${e.message}`;
        throw e;
      });

    if (!objects.Contents) {
      throw Error("s3 response.Contents is falsy");
    }

    const keys: string[] = [];
    for (const obj of objects.Contents) {
      if (obj.Key) {
        keys.push(obj.Key);
      }
    }

    return await Promise.all(keys.map(async (key) => this.readBenchFile(key)));
  }

  async readHistoryCommit(commitSha: string): Promise<Benchmark | null> {
    const key = this.getHistoryCommitKey(commitSha);
    return this.readBenchFileIfExists(key);
  }

  async writeToHistory(benchmark: Benchmark): Promise<void> {
    const key = this.getHistoryCommitKey(benchmark.commitSha);
    this.writeBenchFile(key, benchmark);
  }

  private async readBenchFileIfExists(key: string): Promise<Benchmark | null> {
    try {
      return await this.readBenchFile(key);
    } catch (e) {
      // Found with trial an error
      // NoSuchKey: Error on getObject latest/main: null
      if (e.code === "NoSuchKey") {
        return null;
      } else {
        throw e;
      }
    }
  }

  private async readBenchFile(key: string): Promise<Benchmark> {
    const res = await this.s3
      .getObject({
        Bucket: this.config.Bucket,
        Key: key,
      })
      .promise()
      .catch((e) => {
        e.message = `Error on getObject ${key}: ${e.message}`;
        throw e;
      });

    if (!res.Body) {
      throw Error("s3 response.Body is falsy");
    }

    let str: string;
    if (typeof res.Body === "string") {
      str = res.Body;
    } else {
      const buff = Buffer.from(res.Body as ArrayBuffer);
      str = buff.toString("utf8");
    }

    const {data, metadata} = fromCsv<BenchmarkResults>(str);
    const csvMeta = metadata as unknown as CsvMeta;
    return {commitSha: csvMeta.commit, results: data};
  }

  /** Write result to CSV + metadata as Embedded Metadata */
  private async writeBenchFile(key: string, benchmark: Benchmark): Promise<void> {
    const csvMeta: CsvMeta = {commit: benchmark.commitSha};
    const str = toCsv(benchmark.results, csvMeta as unknown as Record<string, string>);

    await this.s3
      .upload({
        Bucket: this.config.Bucket,
        Body: str,
        Key: key,
      })
      .promise()
      .catch((e) => {
        e.message = `Error on upload ${key}: ${e.message}`;
        throw e;
      });
  }

  private getLatestInBranchKey(branch: string): string {
    return path.join(latestDir, branch);
  }

  private getHistoryCommitKey(commitSha: string): string {
    return path.join(historyDir, commitSha);
  }
}

/** Prevent returning empty strings to JS app layer */
function ifSet(str: string | undefined): string | undefined {
  return str ? str : undefined;
}
