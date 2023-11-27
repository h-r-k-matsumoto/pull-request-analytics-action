import { Collection } from "../data/preparations/types";
import {
  StatsType,
  createReferences,
  createTimelineGanttBar,
  createTimelineTable,
  createTotalTable,
  sortCollectionsByDate,
} from "./utils";

export const createMarkdown = (
  data: Record<string, Record<string, Collection>>
) => {
  const users = Object.keys(data)
    .filter((key) => key !== "total")
    .concat("total");

  const dates = sortCollectionsByDate(data.total);

  const content = dates.map((date) => {
    const timelineContent = ["avg", "median", "p80"].map((type) => {
      const pullRequestTimelineTable = createTimelineTable(
        data,
        type as StatsType,
        users,
        date
      );
      const pullRequestTimelineBar = createTimelineGanttBar(
        data,
        type as StatsType,
        users,
        date
      );

      return `
      ${pullRequestTimelineTable}
      ${pullRequestTimelineBar}
      `;
    });

    const pullRequestTotal = createTotalTable(data, users, date);

    return `
### Pull Request stats(${date})
This section contains stats about pull requests closed during this period.
    ${timelineContent.join("\n")}
    ${pullRequestTotal}
    `;
  });

  return `
## Pull Request report
    ${createReferences()}
    ${content.join("\n")}
  `;
};
