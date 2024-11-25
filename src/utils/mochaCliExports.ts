// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-extraneous-dependencies
import {lookupFiles as lookupFilesMocha, loadOptions as loadOptionsMocha} from "mocha/lib/cli";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-extraneous-dependencies
import collectFilesMocha from "mocha/lib/cli/collect-files";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/no-extraneous-dependencies
import {handleRequires as handleRequiresMocha} from "mocha/lib/cli/run-helpers";

export const lookupFiles = lookupFilesMocha as (
  filepath: string,
  extensions?: string[],
  recursive?: boolean
) => string[];

export const loadOptions = loadOptionsMocha as (argv: string[]) => Record<string, unknown> & {_: string[]};

export interface FileCollectionOptions {
  /** File extensions to use */
  extension: string[];
  /** Files, dirs, globs to run */
  spec: string[];
  /** Files, dirs, globs to ignore */
  ignore: string[];
  /** List of additional files to include */
  file: string[];
  /** Find files recursively */
  recursive: boolean;
  /** Sort test files */
  sort: boolean;
}

export interface FileCollectionResponse {
  files: string[];
  unmatchedFiles: string[];
}

export const collectFiles = collectFilesMocha as (fileCollectParams: FileCollectionOptions) => FileCollectionResponse;

export const handleRequires = handleRequiresMocha as (requires?: string[]) => Promise<unknown>;
