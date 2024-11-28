import * as github from "@actions/github";
import {getGithubEventData, GithubActionsEventData, parseBranchFromRef} from "../utils/index.js";
import {isGaRun} from "../github/context.js";
import {shell} from "./shell.js";

export async function getCurrentBranch(): Promise<string> {
  if (isGaRun()) {
    switch (github.context.eventName) {
      case "pull_request": {
        const eventData = getGithubEventData<GithubActionsEventData["pull_request"]>();
        return eventData.pull_request.head.ref; // base.ref is already parsed
      }

      case "push": {
        return parseBranchFromRef(github.context.ref);
      }
    }
  }

  const refStr = github.context.ref || (await shell("git symbolic-ref HEAD"));
  return parseBranchFromRef(refStr);
}
