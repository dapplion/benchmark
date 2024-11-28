import {expect} from "chai";
import {toCsv, fromCsv} from "../../../src/utils/index.js";

describe("utils / file - csv", () => {
  it("Convert to and from CSV", () => {
    const data = [
      {a: 1, b: "x"},
      {a: 3, b: "y"},
    ];

    const csv = toCsv(data);
    expect(csv).to.equal(`a,b
1,x
3,y
`);

    const dataRev = fromCsv(csv).data;
    expect(dataRev).to.deep.equal(data);
  });

  it("Handle comma in value", () => {
    const data = [{id: "1,2,3"}];
    const csv = toCsv(data);
    expect(csv).to.equal(`id
"1,2,3"
`);
  });

  it("Parse CSV with embedded metadata", () => {
    const data = [
      {a: 1, b: "x"},
      {a: 3, b: "y"},
    ];
    const metadata = {
      commit: "4b235978fa5227dae61a6bed6d73461eeb550dac",
    };

    const csv = toCsv(data, metadata);
    expect(csv).to.equal(`#,commit,4b235978fa5227dae61a6bed6d73461eeb550dac
a,b
1,x
3,y
`);

    const dataRev = fromCsv(csv);
    expect(dataRev.data).to.deep.equal(data, "Wrong data");
    expect(dataRev.metadata).to.deep.equal(metadata, "Wrong metadata");
  });

  it("Parse CSV with only embedded metadata", () => {
    const data: unknown[] = [];
    const metadata = {
      commit: "4b235978fa5227dae61a6bed6d73461eeb550dac",
    };

    const csv = toCsv(data, metadata);
    expect(csv).to.equal(`#,commit,4b235978fa5227dae61a6bed6d73461eeb550dac
`);

    const dataRev = fromCsv(csv);
    expect(dataRev.data).to.deep.equal(data, "Wrong data");
    expect(dataRev.metadata).to.deep.equal(metadata, "Wrong metadata");
  });
});
