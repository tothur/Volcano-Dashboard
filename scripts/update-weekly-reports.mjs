import { readFile, writeFile } from "node:fs/promises";

const WEEKLY_RSS = "https://volcano.si.edu/news/WeeklyVolcanoRSS.xml";
const WEEKLY_PAGE = "https://volcano.si.edu/reports_weekly.cfm";

function decodeEntities(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripMarkup(value) {
  return decodeEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\?s\b/g, "'s")
    .replace(/([A-Za-z])\?([A-Za-z])/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(value) {
  const cleaned = stripMarkup(value);
  const match = cleaned.match(/^(.+?[.!?])(?:\s|$)/);
  return match?.[1] ?? cleaned;
}

function isoDateFromPubDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "";
    const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim() ?? "";
    const titleMatch = title.match(/^(.+?) \((.+?)\) - Report for (.+?) - (.+)$/);
    if (!titleMatch) throw new Error(`Unable to parse weekly report title: ${title}`);

    const [, volcanoName, country, reportPeriod, reportType] = titleMatch;
    return {
      volcanoName,
      country,
      reportPeriod,
      reportType,
      summary: firstSentence(description),
    };
  });
}

async function main() {
  const xml = process.env.WEEKLY_RSS_FILE
    ? await readFile(process.env.WEEKLY_RSS_FILE, "latin1")
    : await fetch(WEEKLY_RSS, {
        headers: {
          accept: "application/rss+xml, application/xml",
          "user-agent": "Volcano-Dashboard weekly report updater",
        },
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Smithsonian RSS request failed: ${response.status} ${response.statusText}`);
        }
        return response.text();
      });
  const pubDate = xml.match(/<channel>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
  const items = parseItems(xml);

  if (!pubDate || !items.length) {
    throw new Error("Smithsonian RSS feed did not include a publication date or report items.");
  }

  const reportDate = isoDateFromPubDate(pubDate);
  const reportPeriod = items[0].reportPeriod;
  const reports = items.map(({ reportPeriod: _reportPeriod, ...report }) => ({
    ...report,
    reportDate: "weeklyReportMetadata.reportDate",
    sourceUrl: "weeklyReportMetadata.sourceUrl",
  }));

  const source = `import type { ActivityReport } from "../types/volcano";

export const weeklyReportMetadata = {
  reportDate: ${JSON.stringify(reportDate)},
  reportPeriod: ${JSON.stringify(reportPeriod)},
  sourceUrl: ${JSON.stringify(WEEKLY_PAGE)},
  notes:
    "Bundled Smithsonian/USGS Weekly Volcanic Activity Report RSS snapshot. This report is preliminary and not a comprehensive list of every active volcano.",
};

export const weeklyActivityReports: ActivityReport[] = [
${reports
  .map(
    (report) => `  {
    volcanoName: ${JSON.stringify(report.volcanoName)},
    country: ${JSON.stringify(report.country)},
    reportType: ${JSON.stringify(report.reportType)},
    reportDate: weeklyReportMetadata.reportDate,
    summary: ${JSON.stringify(report.summary)},
    sourceUrl: weeklyReportMetadata.sourceUrl,
  },`,
  )
  .join("\n")}
];
`;

  await writeFile("src/data/weeklyReports.ts", source);
  console.log(`Wrote ${items.length} weekly activity reports for ${reportPeriod} to src/data/weeklyReports.ts`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
