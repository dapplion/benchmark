import * as github from "@actions/github";
import {BenchmarkComparision} from "../types.js";
import {commetToPrUpdatable, commentToCommit} from "./octokit.js";
import {getGithubEventData, GithubActionsEventData, renderComment} from "../utils/index.js";

export async function postGaComment(resultsComp: BenchmarkComparision): Promise<void> {
  switch (github.context.eventName) {
    case "pull_request": {
      const eventData = getGithubEventData<GithubActionsEventData["pull_request"]>();
      const prNumber = eventData.number;
      if (!prNumber) {
        throw Error("github event data has no PR number");
      }

      // Build a comment to publish to a PR
      const commentBody = renderComment(resultsComp);
      await commetToPrUpdatable(prNumber, commentBody);

      break;
    }

    case "push": {
      // Only comment on performance regression
      if (resultsComp.someFailed) {
        const commentBody = renderComment(resultsComp);
        await commentToCommit(github.context.sha, commentBody);
      }

      break;
    }

    default:
      throw Error(`event not supported ${github.context.eventName}`);
  }
}
