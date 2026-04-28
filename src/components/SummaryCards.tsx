import { AlertTriangle, Database, Flame, RadioTower, TrendingUp } from "lucide-react";
import { weeklyReportMetadata } from "../data/weeklyReports";
import type { Volcano } from "../types/volcano";

function Card({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="panel rounded-lg p-4">
      <div className="mb-4 flex items-center justify-between text-slate-400">
        <span className="label">{label}</span>
        <span className="text-seismo">{icon}</span>
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <p className="mt-1 text-sm text-slate-400">{detail}</p>
    </section>
  );
}

export function SummaryCards({ volcanoes, filtered }: { volcanoes: Volcano[]; filtered: Volcano[] }) {
  const recentCount = volcanoes.filter((volcano) => volcano.latestReportDate).length;
  const eruptingCount = volcanoes.filter((volcano) => volcano.latestReportType?.includes("Eruptive")).length;
  const unrestCount = volcanoes.filter((volcano) => volcano.latestReportType?.includes("Unrest")).length;
  const elevatedCount = volcanoes.filter(
    (volcano) => volcano.alertLevel === "ADVISORY" || volcano.alertLevel === "WATCH" || volcano.alertLevel === "WARNING",
  ).length;
  const regionCount = new Set(filtered.map((volcano) => volcano.region)).size;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card label="Catalog" value={volcanoes.length.toLocaleString()} detail="Bundled global records" icon={<Database size={18} />} />
      <Card label="Erupting" value={eruptingCount} detail={weeklyReportMetadata.reportPeriod} icon={<Flame size={18} />} />
      <Card label="Unrest Reports" value={unrestCount} detail={`${recentCount} total recent reports`} icon={<RadioTower size={18} />} />
      <Card label="USGS Elevated" value={elevatedCount} detail="Live overlay when reachable" icon={<AlertTriangle size={18} />} />
      <Card label="Regions In View" value={regionCount} detail={`${filtered.length.toLocaleString()} matching volcanoes`} icon={<TrendingUp size={18} />} />
    </div>
  );
}
