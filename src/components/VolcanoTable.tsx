import { ArrowUpDown, ChevronDown, ExternalLink } from "lucide-react";
import type { Volcano } from "../types/volcano";
import { VolcanoStatus } from "./StatusPill";

export type SortKey = "name" | "country" | "region" | "type" | "elevation" | "eruption" | "alert" | "report";

const headers: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "country", label: "Country / region" },
  { key: "type", label: "Type" },
  { key: "elevation", label: "Elevation" },
  { key: "eruption", label: "Last known eruption" },
  { key: "alert", label: "Alert / aviation" },
  { key: "report", label: "Latest report" },
];

export function sortVolcanoes(volcanoes: Volcano[], key: SortKey, direction: "asc" | "desc") {
  const sorted = [...volcanoes].sort((a, b) => {
    const multiplier = direction === "asc" ? 1 : -1;
    if (key === "elevation") return ((a.elevationMeters ?? -9999) - (b.elevationMeters ?? -9999)) * multiplier;
    if (key === "alert") return `${a.alertLevel} ${a.aviationColorCode}`.localeCompare(`${b.alertLevel} ${b.aviationColorCode}`) * multiplier;
    if (key === "report") return String(a.latestReportDate ?? "").localeCompare(String(b.latestReportDate ?? "")) * multiplier;
    if (key === "type") return a.volcanoType.localeCompare(b.volcanoType) * multiplier;
    if (key === "eruption") return a.lastKnownEruption.localeCompare(b.lastKnownEruption) * multiplier;
    if (key === "country") return `${a.country} ${a.region}`.localeCompare(`${b.country} ${b.region}`) * multiplier;
    if (key === "region") return a.region.localeCompare(b.region) * multiplier;
    return a.name.localeCompare(b.name) * multiplier;
  });
  return sorted;
}

export function VolcanoTable({
  volcanoes,
  selectedId,
  sortKey,
  sortDirection,
  onSortChange,
  onSelect,
  collapsed,
  onToggle,
}: {
  volcanoes: Volcano[];
  selectedId?: string;
  sortKey: SortKey;
  sortDirection: "asc" | "desc";
  onSortChange: (key: SortKey) => void;
  onSelect: (volcano: Volcano) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="panel rounded-lg">
      <button
        className="flex w-full flex-col gap-1 border-b border-white/10 p-4 text-left transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <div>
          <h2 className="text-base font-semibold text-white">Volcano Catalog</h2>
          <p className="text-sm text-slate-400">{volcanoes.length.toLocaleString()} records in the current view</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-seismo">
          {collapsed ? "Open table" : "Collapse table"}
          <ChevronDown size={18} className={`transition ${collapsed ? "" : "rotate-180"}`} />
        </span>
      </button>
      {collapsed ? null : (
      <div className="volcano-scrollbar overflow-x-auto">
        <table className="min-w-[1040px] w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-slate-400">
            <tr>
              {headers.map((header) => (
                <th key={header.key} className="px-4 py-3">
                  <button className="inline-flex items-center gap-1 hover:text-white" onClick={() => onSortChange(header.key)}>
                    {header.label}
                    <ArrowUpDown size={13} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {volcanoes.slice(0, 250).map((volcano) => (
              <tr
                key={volcano.id}
                className={`cursor-pointer transition hover:bg-white/[0.06] ${
                  selectedId === volcano.id ? "bg-seismo/10" : "bg-transparent"
                }`}
                onClick={() => onSelect(volcano)}
              >
                <td className="px-4 py-3 font-semibold text-white">{volcano.name}</td>
                <td className="px-4 py-3 text-slate-300">
                  <span className="block">{volcano.country}</span>
                  <span className="text-xs text-slate-500">{volcano.region}</span>
                </td>
                <td className="px-4 py-3 text-slate-300">{volcano.volcanoType}</td>
                <td className="px-4 py-3 text-slate-300">
                  {volcano.elevationMeters == null ? "Unknown" : `${volcano.elevationMeters.toLocaleString()} m`}
                </td>
                <td className="px-4 py-3 text-slate-300">{volcano.lastKnownEruption}</td>
                <td className="px-4 py-3"><VolcanoStatus volcano={volcano} /></td>
                <td className="px-4 py-3 text-slate-300">
                  <span className="block">{volcano.latestReportDate ?? "No current report"}</span>
                  <span className="text-xs text-slate-500">{volcano.latestReportType ?? volcano.catalogStatus}</span>
                </td>
                <td className="px-4 py-3">
                  <a
                    className="inline-flex items-center gap-1 text-seismo hover:text-white"
                    href={volcano.sourceUrls.usgs ?? volcano.sourceUrls.weeklyReport ?? volcano.sourceUrls.smithsonian}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Open <ExternalLink size={13} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      {volcanoes.length > 250 ? (
        !collapsed ? <p className="border-t border-white/10 px-4 py-3 text-sm text-slate-400">
          Showing first 250 sorted matches. Narrow the filters to inspect smaller subsets.
        </p> : null
      ) : null}
      {!collapsed && volcanoes.length === 0 ? (
        <div className="px-4 py-10 text-center text-slate-400">No volcanoes match the selected filters.</div>
      ) : null}
    </section>
  );
}
