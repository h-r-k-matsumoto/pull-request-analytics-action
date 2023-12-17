import { getMultipleValuesInput } from "../common/utils";
import { octokit } from "../octokit/octokit";

export const getOrgRepositories = async () => {
  let repositories:string[][] = [];
  for (let orgName of getMultipleValuesInput("GITHUB_OWNERS")) {
    let listForOrg = await octokit.paginate(octokit.rest.repos.listForOrg, { org: orgName });
    listForOrg.forEach(r=>console.log(`${r.owner.login} ---- ${r.archived}`));
    listForOrg = listForOrg.filter((r) => !r.archived);
    repositories = repositories.concat(listForOrg.map((r) => [r.owner.login, r.name]));
    console.log(`repositories length = ${repositories.length}`);
  }
  for(let r of repositories){
    console.log(`r=${r[0]}\t${r[1]}`);
  }
  return repositories;
};
