import fs from "node:fs";
import {expect} from "chai";
import rimraf from "rimraf";
import {Benchmark} from "../../../src/types.js";
import {LocalHistoryProvider} from "../../../src/history/local.js";

describe("benchmark history local", () => {
  const branch = "main";
  const benchmark: Benchmark = {
    commitSha: "010101010101010101010101",
    results: [{id: "for loop", averageNs: 16573, runsDone: 1024, totalMs: 465, threshold: 2}],
  };

  const testDir = fs.mkdtempSync("test_files_");
  const historyProvider = new LocalHistoryProvider(testDir);

  after(() => {
    rimraf.sync(testDir);
  });

  it("Should write and read history", async () => {
    await historyProvider.writeToHistory(benchmark);

    const benchmarks = await historyProvider.readHistory();
    expect(benchmarks).to.deep.equal([benchmark], "Wrong history");
  });

  it("Should write and read latest in branch", async () => {
    await historyProvider.writeLatestInBranch(branch, benchmark);

    const benchRead = await historyProvider.readLatestInBranch(branch);
    expect(benchRead).to.deep.equal(benchmark, "Wrong bench read from disk");
  });
});
