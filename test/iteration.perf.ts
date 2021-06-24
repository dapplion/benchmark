import {itBench, setBenchOpts} from "../src";

// As of Jun 17 2021
// Compare state root
// ================================================================
// ssz.Root.equals                                                        891265.6 ops/s      1.122000 us/op 10017946 runs    15.66 s
// ssz.Root.equals with valueOf()                                         692041.5 ops/s      1.445000 us/op 8179741 runs    15.28 s
// byteArrayEquals with valueOf()                                         853971.0 ops/s      1.171000 us/op 9963051 runs    16.07 s

describe("Array iteration", () => {
  setBenchOpts({
    maxMs: 60 * 1000,
    // This bench is very fast, with 1s it can do 300k runs
    minMs: 0.5 * 1000,
    runs: 128,
  });

  // nonce = 4
  let n = 1e6;
  const arr = Array.from({length: n}, (_, i) => i);

  itBench("sum array with raw for loop", () => {
    let sum = 0;
    for (let i = 0, len = arr.length; i < len; i++) {
      sum += i;
    }
  });

  itBench("sum array with reduce", () => {
    arr.reduce((total, curr) => total + curr, 0);
  });
});
