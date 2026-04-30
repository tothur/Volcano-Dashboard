import { ExternalLink, X } from "lucide-react";
import type { Volcano } from "../types/volcano";
import { VolcanoStatus } from "./StatusPill";

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-white/10 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}

export function DetailPanel({ volcano, onClose }: { volcano?: Volcano; onClose: () => void }) {
  if (!volcano) return null;

  const sourceLinks = [
    ["Smithsonian/GVP list", volcano.sourceUrls.smithsonian],
    ["NOAA metadata", volcano.sourceUrls.noaa],
    ["USGS notice", volcano.sourceUrls.usgs],
    ["Weekly report", volcano.sourceUrls.weeklyReport],
    ["Daily report", volcano.sourceUrls.dailyReport],
  ].filter(([, url]) => Boolean(url));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close detail modal" />
      <aside className="panel relative z-10 w-full max-w-3xl overflow-hidden rounded-lg">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <p className="label mb-2">Volcano Detail</p>
            <h2 className="text-2xl font-semibold text-white">{volcano.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{volcano.country} / {volcano.region}</p>
          </div>
          <button
            className="rounded-md border border-white/10 p-2 text-slate-400 transition hover:text-white"
            onClick={onClose}
            aria-label="Close detail modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="volcano-scrollbar max-h-[min(74vh,720px)] space-y-5 overflow-y-auto p-5">
          <VolcanoStatus volcano={volcano} />

          <dl>
            <DataRow label="Coordinates" value={`${volcano.latitude.toFixed(4)}, ${volcano.longitude.toFixed(4)}`} />
            <DataRow label="Elevation" value={volcano.elevationMeters == null ? "Unknown" : `${volcano.elevationMeters.toLocaleString()} m`} />
            <DataRow label="Type" value={volcano.volcanoType} />
            <DataRow label="Catalog status" value={volcano.catalogStatus} />
            <DataRow label="Last eruption" value={volcano.lastKnownEruption} />
            <DataRow label="Alert level" value={volcano.alertLevel} />
            <DataRow label="Aviation code" value={volcano.aviationColorCode} />
          </dl>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase text-slate-300">Latest Activity Context</h3>
            <div className="rounded-lg border border-white/10 bg-basalt-950/60 p-4">
              <p className="text-sm text-slate-200">{volcano.latestReportSummary ?? "No recent activity report is bundled or currently available for this volcano."}</p>
              <p className="mt-3 text-xs text-slate-500">
                {volcano.latestReportDate ? `Latest report date: ${volcano.latestReportDate}` : "Historical metadata only in the current dataset."}
              </p>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase text-slate-300">Alert History</h3>
            {volcano.alertHistory.length ? (
              <div className="space-y-2">
                {volcano.alertHistory.map((entry, index) => (
                  <a
                    key={`${entry.date}-${index}`}
                    className="block rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:border-seismo/50"
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="text-xs font-semibold text-seismo">{entry.source} / {entry.date}</span>
                    <p className="mt-1 text-sm text-slate-300">{entry.summary}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-400">
                No alert history is available in the bundled dataset. This dashboard does not infer hazard levels from historical metadata.
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase text-slate-300">Sources</h3>
            <div className="flex flex-wrap gap-2">
              {sourceLinks.map(([label, url]) => (
                <a
                  key={label}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-seismo/60 hover:text-white"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {label} <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
