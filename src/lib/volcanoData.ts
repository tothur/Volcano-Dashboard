import { weeklyActivityReports } from "../data/weeklyReports";
import type {
  ActivityReport,
  ActivityReportType,
  AlertLevel,
  AviationColorCode,
  UsgsElevatedVolcano,
  Volcano,
  VolcanoCatalogPayload,
} from "../types/volcano";

const ALERT_PRIORITY: Record<AlertLevel, number> = {
  WARNING: 5,
  WATCH: 4,
  ADVISORY: 3,
  NORMAL: 1,
  UNASSIGNED: 0,
  UNKNOWN: 0,
};

const COLOR_PRIORITY: Record<AviationColorCode, number> = {
  RED: 5,
  ORANGE: 4,
  YELLOW: 3,
  GREEN: 1,
  UNASSIGNED: 0,
  UNKNOWN: 0,
};

export function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeAlertLevel(value?: string): AlertLevel {
  const level = String(value ?? "").toUpperCase();
  if (level === "NORMAL" || level === "ADVISORY" || level === "WATCH" || level === "WARNING") return level;
  if (level === "UNASSIGNED") return "UNASSIGNED";
  return "UNKNOWN";
}

function normalizeAviationColorCode(value?: string): AviationColorCode {
  const code = String(value ?? "").toUpperCase();
  if (code === "GREEN" || code === "YELLOW" || code === "ORANGE" || code === "RED") return code;
  if (code === "UNASSIGNED") return "UNASSIGNED";
  return "UNKNOWN";
}

function reportStatus(reportType: string): Volcano["status"] {
  if (reportType.includes("Eruptive")) return "confirmed-eruption";
  if (reportType.includes("Unrest")) return "unrest";
  return "holocene";
}

const MONTHS: Record<string, string> = {
  January: "01",
  Jan: "01",
  February: "02",
  Feb: "02",
  March: "03",
  Mar: "03",
  April: "04",
  Apr: "04",
  May: "05",
  June: "06",
  Jun: "06",
  July: "07",
  Jul: "07",
  August: "08",
  Aug: "08",
  September: "09",
  Sep: "09",
  October: "10",
  Oct: "10",
  November: "11",
  Nov: "11",
  December: "12",
  Dec: "12",
};

function parseSmithsonianDate(value: string) {
  const match = value.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  const monthNumber = MONTHS[month];
  if (!monthNumber) return undefined;
  return `${year}-${monthNumber}-${day.padStart(2, "0")}`;
}

function dailyReportType(value: string): ActivityReportType {
  const normalized = value.toLowerCase();
  if (normalized.includes("new") && normalized.includes("eruption")) return "New Eruptive Activity";
  if (normalized.includes("eruption")) return "Continuing Eruptive Activity";
  if (normalized.includes("new") && normalized.includes("unrest")) return "New Unrest";
  if (normalized.includes("unrest")) return "Continuing Unrest";
  return "Other Observations";
}

function compactText(value: string, maxLength = 280) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trim()}...` : cleaned;
}

export async function loadBundledCatalog(): Promise<VolcanoCatalogPayload> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/volcanoes.json`);
  if (!response.ok) {
    throw new Error(`Unable to load bundled volcano catalog (${response.status})`);
  }
  return response.json() as Promise<VolcanoCatalogPayload>;
}

export async function fetchUsgsElevatedVolcanoes(signal?: AbortSignal): Promise<UsgsElevatedVolcano[]> {
  const response = await fetch("https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes", {
    signal,
  });
  if (!response.ok) {
    throw new Error(`USGS elevated-volcano request failed (${response.status})`);
  }
  const payload = await response.json();
  return Array.isArray(payload) ? (payload as UsgsElevatedVolcano[]) : [];
}

export interface DailyActivityPayload {
  reportDate: string;
  bestAvailableDate?: string;
  sourceUrl: string;
  reports: ActivityReport[];
}

export function parseDailyActivityReports(html: string, sourceUrl: string): DailyActivityPayload {
  const document = new DOMParser().parseFromString(html, "text/html");
  const pageText = document.body.textContent ?? "";
  const reportDate = parseSmithsonianDate(pageText.match(/DVAR for ([^.]+? \d{4})/)?.[1] ?? "");
  const bestAvailableDate = parseSmithsonianDate(pageText.match(/best available as of ([^.]+? \d{4})/)?.[1] ?? "");

  if (!reportDate) {
    throw new Error("No daily activity report date could be parsed.");
  }

  const reports = Array.from(document.querySelectorAll("h5"))
    .map((heading): ActivityReport | undefined => {
      const headingText = compactText(heading.textContent ?? "", 180).replace(/Cite this Report.*/, "").trim();
      const match = headingText.match(/^(.+?)\s*\((.+?)\)\s*\|\s*(.+)$/);
      if (!match) return undefined;

      const [, volcanoName, country, rawType] = match;
      const citeLink = heading.querySelector<HTMLAnchorElement>("a[href*='showreport.cfm']")?.getAttribute("href");
      const reportUrl = citeLink ? new URL(citeLink, sourceUrl).toString() : sourceUrl;
      const cellText = heading.closest("td")?.textContent?.replace(heading.textContent ?? "", "") ?? "";
      const summary =
        compactText(cellText.replace(/Cite this Report/g, ""), 280) ||
        `Daily Volcanic Activity Report lists ${volcanoName.trim()} as ${rawType.trim().toLowerCase()}.`;

      return {
        volcanoName: volcanoName.trim(),
        country: country.trim(),
        reportType: dailyReportType(rawType),
        reportDate,
        summary,
        sourceUrl: reportUrl,
      };
    })
    .filter((report): report is ActivityReport => Boolean(report));

  if (!reports.length) {
    throw new Error("No daily activity reports could be parsed.");
  }

  return { reportDate, bestAvailableDate, sourceUrl, reports };
}

async function fetchTextWithTimeout(url: string, signal?: AbortSignal, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`request failed (${response.status})`);
    return response.text();
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export async function fetchSmithsonianDailyActivity(signal?: AbortSignal): Promise<DailyActivityPayload> {
  const sourceUrl = "https://volcano.si.edu/reports_daily.cfm";
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(sourceUrl)}`;
  const errors: string[] = [];

  for (const url of [sourceUrl, proxyUrl]) {
    try {
      const html = await fetchTextWithTimeout(url, signal);
      return parseDailyActivityReports(html, sourceUrl);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "unknown error");
    }
  }

  throw new Error(`Daily Smithsonian activity feed unavailable: ${errors.join("; ")}`);
}

function applyActivityReport(
  byId: Map<string, Volcano>,
  byName: Map<string, string>,
  report: ActivityReport,
  source: "Smithsonian/GVP" | "Smithsonian/DVAR",
) {
  const id = byName.get(normalizeName(report.volcanoName));
  if (!id) return;
  const volcano = byId.get(id);
  if (!volcano) return;

  volcano.latestReportDate = report.reportDate;
  volcano.latestReportSummary = report.summary;
  volcano.latestReportType = report.reportType;
  volcano.status = reportStatus(report.reportType);
  if (source === "Smithsonian/DVAR") {
    volcano.sourceUrls.dailyReport = report.sourceUrl;
  } else {
    volcano.sourceUrls.weeklyReport = report.sourceUrl;
  }
  volcano.alertHistory.unshift({
    date: report.reportDate,
    source,
    summary: `${report.reportType}: ${report.summary}`,
    url: report.sourceUrl,
  });
}

export function mergeActivitySources(
  volcanoes: Volcano[],
  usgsElevated: UsgsElevatedVolcano[] = [],
  dailyReports: ActivityReport[] = [],
) {
  const byId = new Map(
    volcanoes.map((volcano) => [
      volcano.id,
      { ...volcano, sourceUrls: { ...volcano.sourceUrls }, alertHistory: [...volcano.alertHistory] },
    ]),
  );
  const byName = new Map(volcanoes.map((volcano) => [normalizeName(volcano.name), volcano.id]));

  for (const report of weeklyActivityReports) {
    applyActivityReport(byId, byName, report, "Smithsonian/GVP");
  }

  for (const report of dailyReports) {
    applyActivityReport(byId, byName, report, "Smithsonian/DVAR");
  }

  for (const alert of usgsElevated) {
    const id = byId.has(alert.vnum) ? alert.vnum : byName.get(normalizeName(alert.volcano_name));
    if (!id) continue;
    const volcano = byId.get(id);
    if (!volcano) continue;

    const alertLevel = normalizeAlertLevel(alert.alert_level);
    const aviationColorCode = normalizeAviationColorCode(alert.color_code);
    volcano.alertLevel = alertLevel;
    volcano.aviationColorCode = aviationColorCode;
    volcano.status = ALERT_PRIORITY[alertLevel] > 1 || COLOR_PRIORITY[aviationColorCode] > 1 ? "elevated-alert" : volcano.status;
    volcano.latestReportDate = alert.sent_utc?.slice(0, 10) || volcano.latestReportDate;
    volcano.latestReportSummary =
      `${alert.obs_fullname ?? "USGS"} lists ${volcano.name} at ${alertLevel} / ${aviationColorCode}.` ||
      volcano.latestReportSummary;
    volcano.sourceUrls.usgs = alert.notice_url;
    volcano.alertHistory.unshift({
      date: alert.sent_utc,
      alertLevel,
      aviationColorCode,
      source: "USGS",
      summary: `${alert.obs_fullname ?? "USGS"} elevated alert: ${alertLevel} / ${aviationColorCode}.`,
      url: alert.notice_url,
    });
  }

  return Array.from(byId.values());
}

export function getAlertPriority(volcano: Volcano) {
  return Math.max(ALERT_PRIORITY[volcano.alertLevel], COLOR_PRIORITY[volcano.aviationColorCode]);
}

export function choosePriorityVolcano(volcanoes: Volcano[]) {
  const weighted = volcanoes
    .filter((volcano) => getAlertPriority(volcano) > 0 || volcano.latestReportDate)
    .sort((a, b) => {
      const alertDelta = getAlertPriority(b) - getAlertPriority(a);
      if (alertDelta) return alertDelta;

      const eruptiveDelta =
        Number(b.latestReportType?.includes("Eruptive") ?? false) - Number(a.latestReportType?.includes("Eruptive") ?? false);
      if (eruptiveDelta) return eruptiveDelta;

      return String(b.latestReportDate ?? "").localeCompare(String(a.latestReportDate ?? ""));
    });

  return weighted[0];
}

export function alertLabel(volcano: Volcano) {
  if (volcano.alertLevel !== "UNKNOWN" || volcano.aviationColorCode !== "UNKNOWN") {
    return `${volcano.alertLevel} / ${volcano.aviationColorCode}`;
  }
  if (volcano.latestReportType) return volcano.latestReportType;
  return "No current alert";
}
