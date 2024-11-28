import fs from "node:fs";
import csvParse from "csv-parse/lib/sync.js";
import csvStringify from "csv-stringify/lib/sync.js";

type CsvMetadata = Record<string, string>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CsvData = any[];

export function readJson<T>(filepath: string): T {
  const jsonStr = fs.readFileSync(filepath, "utf8");

  let json: T;
  try {
    json = JSON.parse(jsonStr) as T;
  } catch (e) {
    throw Error(`Error parsing JSON ${filepath}: ${(e as Error).message}`);
  }

  // TODO: Validate schema

  return json;
}

export function writeJson<T>(filepath: string, json: T): void {
  const jsonStr = JSON.stringify(json, null, 2);
  fs.writeFileSync(filepath, jsonStr);
}

export function fromCsv<T extends CsvData>(str: string): {data: T; metadata: CsvMetadata} {
  const {csv, metadata} = splitCsvMetadata(str);
  return {
    data: csvParse(csv, {columns: true, cast: true}) as T,
    metadata,
  };
}

export function toCsv<T extends CsvData>(data: T, metadata?: CsvMetadata): string {
  // Support Embedded Metadata https://www.w3.org/TR/tabular-data-model/#embedded-metadata
  const csv = csvStringify(data, {header: true});
  if (metadata) {
    const metadataStr = toCsvMetadata(metadata);
    return `${metadataStr}\n${csv}`;
  } else {
    return csv;
  }
}

// CSV metadata

export function toCsvMetadata(metadata: Record<string, string>): string {
  return Object.entries(metadata)
    .map(([key, value]) => `#,${key},${value}`)
    .join("\n");
}

/**
 * Embedded Metadata https://www.w3.org/TR/tabular-data-model/#embedded-metadata
 */
function splitCsvMetadata(str: string): {csv: string; metadata: Record<string, string>} {
  const metadata: Record<string, string> = {};
  const rows = str.trim().split("\n");

  let i = 0;
  for (i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.startsWith("#")) {
      const [key, value] = row.slice(2).split(",");
      metadata[key] = value;
    } else {
      break;
    }
  }
  return {csv: rows.slice(i).join("\n"), metadata};
}
