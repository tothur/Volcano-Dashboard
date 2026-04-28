import { weeklyActivityReports } from "../data/weeklyReports";
import type {
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

export function mergeActivitySources(volcanoes: Volcano[], usgsElevated: UsgsElevatedVolcano[] = []) {
  const byId = new Map(volcanoes.map((volcano) => [volcano.id, { ...volcano, alertHistory: [...volcano.alertHistory] }]));
  const byName = new Map(volcanoes.map((volcano) => [normalizeName(volcano.name), volcano.id]));

  for (const report of weeklyActivityReports) {
    const id = byName.get(normalizeName(report.volcanoName));
    if (!id) continue;
    const volcano = byId.get(id);
    if (!volcano) continue;

    volcano.latestReportDate = report.reportDate;
    volcano.latestReportSummary = report.summary;
    volcano.latestReportType = report.reportType;
    volcano.status = reportStatus(report.reportType);
    volcano.sourceUrls.weeklyReport = report.sourceUrl;
    volcano.alertHistory.push({
      date: report.reportDate,
      source: "Smithsonian/GVP",
      summary: `${report.reportType}: ${report.summary}`,
      url: report.sourceUrl,
    });
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
