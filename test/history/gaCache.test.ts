import {expect} from "chai";
import {Benchmark} from "../../src/types";
import {getGaCacheHistoryProvider} from "../../src/history/gaCache";
import {isGaRun} from "../../src/github/context";

// Currently fails with
//
// Error: reserveCache failed: Cache Service Url not found, unable to restore cache
//
// See:
//  - https://github.com/nektos/act/issues/329
//  - https://github.com/nektos/act/issues/285
describe.skip("benchmark history gaCache", function () {
  this.timeout(60 * 1000);

  const cacheKey = "ga-cache-testing";
  let historyProvider: ReturnType<typeof getGaCacheHistoryProvider>;

  const benchmark: Benchmark = {
    commitSha: "010101010101010101010101",
    results: [{id: "for loop", averageNs: 16573, runsDone: 1024, totalMs: 465}],
  };

  before(() => {
    historyProvider = getGaCacheHistoryProvider(cacheKey);
  });

  it("Should write history to ga-cache", async function () {
    if (!isGaRun()) this.skip();

    await historyProvider.writeCommit(benchmark);
  });

  it("Should read history from ga-cache", async function () {
    if (!isGaRun()) this.skip();

    const benchRead = await historyProvider.readCommit(benchmark.commitSha);
    expect(benchRead).to.deep.equal(benchmark, "Wrong bench read from disk");
  });
});