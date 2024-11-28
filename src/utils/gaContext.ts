import fs from "node:fs";

/**
 * Github actions store the event data payload at a JSON file with path
 * process.env.GITHUB_EVENT_PATH
 *
 * For example: '/home/runner/work/_temp/_github_workflow/event.json'
 *
 * The contents of the file are event dependant and equal to this docs
 * https://docs.github.com/en/free-pro-team@latest/developers/webhooks-and-events/webhook-events-and-payloads#webhook-payload-object-5
 *
 * For example (on delete):
 *
 * {
 *    "pusher_type": "user",
 *    "ref": "dapplion/branch-to-delete",
 *    "ref_type": "branch",
 *    "repository": { ... },
 *    "organization": { ... },
 *    "sender": { ... }
 * }
 */
export function getGithubEventData<T>(): T {
  if (!process.env.GITHUB_EVENT_PATH) {
    throw Error("Not in a Github Actions context, no GITHUB_EVENT_PATH");
  }

  return JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) as T;
}

export interface GithubActionsEventData {
  delete: {
    /** "dapplion/branch-to-delete" */
    ref: string;
    /** "branch" */
    ref_type: string;
    repository: GithubActionsRepository;
    organization: GithubActionsOrganization;
    sender: GithubActionsUser;
  };
  pull_request: {
    /** The action that was performed */
    action: string;
    /** The pull request number */
    number: number;
    pull_request: GithubActionsPullRequestObject;
    repository: GithubActionsRepository;
    organization: GithubActionsOrganization;
    sender: GithubActionsUser;
  };
  push: {
    /** The full git ref that was pushed, "refs/heads/dapplion/feat1" */
    ref: string;
    /**  The SHA of the most recent commit on ref before the push, "6113728f27ae82c7b1a177c8d03f9e96e0adf246" */
    before: string;
    /**  The SHA of the most recent commit on ref after the push, "9612ade44aab69f0a972d69de73d64955b8ed1ef" */
    after: string;
    created: boolean;
    deleted: boolean;
    forced: boolean;
  };
}

interface GithubActionsRepository {
  id: number;
  /** "dapplion/my-repo" */
  full_name: string;
}
type GithubActionsOrganization = {
  id: number;
  /** "my-repo" */
  login: string;
};
interface GithubActionsUser {
  id: number;
  /** "dapplion" */
  login: string;
}

interface GithubActionsPullRequestObject {
  head: GithubActionsPrBase;
  base: GithubActionsPrBase;
  draft: boolean;
  merged: boolean;
  repository: GithubActionsRepository;
  sender: GithubActionsUser;
}

interface GithubActionsPrBase {
  /** `${userName}:${branchName}`,  "dapplion:dapplion/feat1" */
  label: string;
  /** branch name, "dapplion/feat1" */
  ref: string;
  /** head commit sha, "6dcb09b5b57875f334f61aebed695e2e4193db5e"; */
  sha: string;
  user: GithubActionsUser;
}
