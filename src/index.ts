import "dotenv/config";
import * as core from "@actions/core";

import { createMarkdown } from "./view";
import {
  createIssue,
  getOrgRepositories,
  getOwnersRepositories,
  makeComplexRequest,
} from "./requests";
import { collectData } from "./converters";
import { octokit } from "./octokit/octokit";
import { getMultipleValuesInput } from "./common/utils";

async function main() {
  if (process.env.TIMEZONE || core.getInput("TIMEZONE")) {
    process.env.TZ = process.env.TIMEZONE || core.getInput("TIMEZONE");
  }
  if (
    ((!process.env.GITHUB_REPO_FOR_ISSUE ||
      !process.env.GITHUB_OWNER_FOR_ISSUE) &&
      (!core.getInput("GITHUB_OWNER_FOR_ISSUE") ||
        !core.getInput("GITHUB_REPO_FOR_ISSUE"))) ||
    ((!core.getInput("GITHUB_OWNERS_REPOS") &&
      !process.env.GITHUB_OWNERS_REPOS) ||
      !core.getInput("GITHUB_OWNERS")) &&
    (!core.getInput("GITHUB_TOKEN") && !process.env.GITHUB_TOKEN)
  ) {
    throw new Error("Missing required variables");
  }
  const rateLimitAtBeginning = await octokit.rest.rateLimit.get();
  console.log(
    "RATE LIMIT REMAINING BEFORE REQUESTS: ",
    rateLimitAtBeginning.data.rate.remaining
  );

  console.log(`GITHUB_OWNERS=${ core.getInput("GITHUB_OWNERS")}`);
  const ownersRepos = core.getInput("GITHUB_OWNERS") ? await getOrgRepositories() : getOwnersRepositories();
  console.log("Initiating data request.");
  const data = [];
  for (let i = 0; i < ownersRepos.length; i++) {
    const result = await makeComplexRequest(
      parseInt(core.getInput("AMOUNT")) || +process.env.AMOUNT!,
      {
        owner: ownersRepos[i][0],
        repo: ownersRepos[i][1],
      },
      {
        skipReviews: false,
        skipComments: false,
      }
    );
    data.push(result);
  }

  console.log("Data successfully retrieved. Starting report calculations.");

  const mergedData = data.reduce<
    Awaited<ReturnType<typeof makeComplexRequest>>
  >(
    (acc, element) => ({
      ownerRepo: acc.ownerRepo
        ? acc.ownerRepo.concat(",", element!.ownerRepo)
        : element!.ownerRepo,
      reviews: [...acc.reviews, ...element!.reviews],
      pullRequestInfo: [...acc?.pullRequestInfo, ...element!.pullRequestInfo],
      comments: [...acc?.comments, ...element!.comments],
    }),
    {
      ownerRepo: "",
      reviews: [],
      pullRequestInfo: [],
      comments: [],
    }
  );
  const preparedData = collectData(mergedData);
  core.setOutput("JSON_COLLECTION", JSON.stringify(preparedData));
  console.log("Calculation complete. Generating markdown.");
  const markdown = createMarkdown(preparedData);
  console.log("Markdown successfully generated.");
  getMultipleValuesInput("EXECUTION_OUTCOME")
    .filter((outcome) => ["new-issue", "output"].includes(outcome))
    .forEach((outcome) => {
      if (outcome === 'new-issue') {
        createIssue(markdown);
      } else if (outcome === 'output') {
        core.setOutput("MARKDOWN", markdown);
      }
    });

  const rateLimitAtEnd = await octokit.rest.rateLimit.get();
  console.log(
    "RATE LIMIT REMAINING AFTER REQUESTS: ",
    rateLimitAtEnd.data.rate.remaining
  );
}

main();
