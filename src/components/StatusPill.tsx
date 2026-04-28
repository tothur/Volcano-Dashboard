import type { ActivityReportType, AlertLevel, AviationColorCode, Volcano } from "../types/volcano";

const alertStyles: Record<AlertLevel | AviationColorCode, string> = {
  RED: "border-red-400/50 bg-red-500/15 text-red-200",
  WARNING: "border-red-400/50 bg-red-500/15 text-red-200",
  ORANGE: "border-orange-400/50 bg-orange-500/15 text-orange-200",
  WATCH: "border-orange-400/50 bg-orange-500/15 text-orange-200",
  YELLOW: "border-yellow-300/50 bg-yellow-400/15 text-yellow-100",
  ADVISORY: "border-yellow-300/50 bg-yellow-400/15 text-yellow-100",
  GREEN: "border-emerald-300/50 bg-emerald-400/15 text-emerald-100",
  NORMAL: "border-emerald-300/50 bg-emerald-400/15 text-emerald-100",
  UNASSIGNED: "border-slate-400/40 bg-slate-400/10 text-slate-200",
  UNKNOWN: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

const reportStyles: Record<ActivityReportType, string> = {
  "New Eruptive Activity": "border-red-400/50 bg-red-500/15 text-red-100",
  "Continuing Eruptive Activity": "border-orange-400/50 bg-orange-500/15 text-orange-100",
  "New Unrest": "border-yellow-300/50 bg-yellow-400/15 text-yellow-100",
  "Continuing Unrest": "border-yellow-300/50 bg-yellow-400/10 text-yellow-100",
  "Other Observations": "border-sky-300/40 bg-sky-400/10 text-sky-100",
  "USGS Alert": "border-orange-400/50 bg-orange-500/15 text-orange-100",
};

export function StatusPill({ label, tone }: { label: string; tone?: AlertLevel | AviationColorCode | ActivityReportType }) {
  const style = tone && tone in reportStyles ? reportStyles[tone as ActivityReportType] : alertStyles[(tone as AlertLevel) ?? "UNKNOWN"];

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}

export function VolcanoStatus({ volcano }: { volcano: Volcano }) {
  if (volcano.aviationColorCode !== "UNKNOWN") {
    return <StatusPill label={`${volcano.alertLevel} / ${volcano.aviationColorCode}`} tone={volcano.aviationColorCode} />;
  }
  if (volcano.latestReportType) return <StatusPill label={volcano.latestReportType} tone={volcano.latestReportType} />;
  return <StatusPill label="No current alert" tone="UNKNOWN" />;
}
