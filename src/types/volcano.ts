export type AlertLevel = "NORMAL" | "ADVISORY" | "WATCH" | "WARNING" | "UNASSIGNED" | "UNKNOWN";

export type AviationColorCode = "GREEN" | "YELLOW" | "ORANGE" | "RED" | "UNASSIGNED" | "UNKNOWN";

export type ActivityStatus =
  | "confirmed-eruption"
  | "unrest"
  | "elevated-alert"
  | "historical"
  | "holocene"
  | "unknown";

export type ActivityReportType =
  | "New Eruptive Activity"
  | "Continuing Eruptive Activity"
  | "New Unrest"
  | "Continuing Unrest"
  | "Other Observations"
  | "USGS Alert";

export interface SourceUrls {
  smithsonian?: string;
  noaa?: string;
  usgs?: string;
  weeklyReport?: string;
  dailyReport?: string;
}

export interface ActivityReport {
  volcanoName: string;
  country?: string;
  region?: string;
  reportType: ActivityReportType;
  reportDate: string;
  eruptionStartDate?: string;
  summary: string;
  sourceUrl: string;
}

export interface AlertHistoryEntry {
  date: string;
  alertLevel?: AlertLevel;
  aviationColorCode?: AviationColorCode;
  source: "USGS" | "Smithsonian/GVP" | "Smithsonian/DVAR" | "Bundled";
  summary: string;
  url?: string;
}

export interface Volcano {
  id: string;
  name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  elevationMeters: number | null;
  volcanoType: string;
  lastKnownEruption: string;
  status: ActivityStatus;
  catalogStatus: string;
  alertLevel: AlertLevel;
  aviationColorCode: AviationColorCode;
  latestReportDate?: string;
  latestReportSummary?: string;
  latestReportType?: ActivityReportType;
  sourceUrls: SourceUrls;
  alertHistory: AlertHistoryEntry[];
}

export interface VolcanoCatalogMetadata {
  generatedAt: string;
  sourceName: string;
  sourceUrl: string;
  sourceNotes: string;
  recordCount: number;
}

export interface VolcanoCatalogPayload {
  metadata: VolcanoCatalogMetadata;
  volcanoes: Volcano[];
}

export interface UsgsElevatedVolcano {
  volcano_name: string;
  vnum: string;
  sent_utc: string;
  color_code?: string;
  alert_level?: string;
  notice_url?: string;
  notice_data?: string;
  obs_fullname?: string;
}
