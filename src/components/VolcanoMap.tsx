import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { alertLabel } from "../lib/volcanoData";
import type { Volcano } from "../types/volcano";
import { VolcanoStatus } from "./StatusPill";

function markerColor(volcano: Volcano) {
  if (volcano.aviationColorCode === "RED" || volcano.alertLevel === "WARNING") return "#ef4444";
  if (volcano.aviationColorCode === "ORANGE" || volcano.alertLevel === "WATCH") return "#f97316";
  if (volcano.aviationColorCode === "YELLOW" || volcano.alertLevel === "ADVISORY") return "#eab308";
  if (volcano.latestReportType?.includes("Eruptive")) return "#fb923c";
  if (volcano.latestReportType?.includes("Unrest")) return "#facc15";
  if (volcano.status === "historical") return "#36c5a3";
  return "#94a3b8";
}

function markerRadius(volcano: Volcano) {
  if (volcano.aviationColorCode === "RED" || volcano.alertLevel === "WARNING") return 10;
  if (volcano.aviationColorCode === "ORANGE" || volcano.alertLevel === "WATCH") return 9;
  if (volcano.latestReportDate) return 7;
  if (volcano.status === "historical") return 5;
  return 4;
}

function SelectedMapMover({ selected }: { selected?: Volcano }) {
  const map = useMap();

  useEffect(() => {
    if (!selected) return;
    map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 5), { duration: 0.6 });
  }, [map, selected]);

  return null;
}

export function VolcanoMap({
  volcanoes,
  selected,
  onSelect,
  controls,
}: {
  volcanoes: Volcano[];
  selected?: Volcano;
  onSelect: (volcano: Volcano) => void;
  controls?: ReactNode;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <section className="panel overflow-hidden rounded-lg">
      <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Global Volcano Network</h2>
          <p className="text-sm text-slate-400">Marker tone distinguishes alert codes, weekly activity, and historical metadata.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-red-500" /> Warning</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Watch</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-yellow-400" /> Advisory / unrest</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-seismo" /> Historical</span>
        </div>
      </div>
      <div className="relative h-[540px] lg:h-[680px]">
        {controls ? (
          <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[calc(100%-1.5rem)]">
            <div className="pointer-events-auto">
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-white/15 bg-basalt-950/75 px-3 text-sm font-semibold text-slate-100 shadow-glow backdrop-blur-md transition hover:border-seismo/60"
                onClick={() => setFiltersOpen((value) => !value)}
                aria-expanded={filtersOpen}
              >
                {filtersOpen ? <X size={16} /> : <SlidersHorizontal size={16} />}
                Filters
              </button>
              {filtersOpen ? <div className="mt-2 w-[min(1120px,calc(100vw-2rem))]">{controls}</div> : null}
            </div>
          </div>
        ) : null}
        <MapContainer center={[18, 12]} zoom={2} minZoom={2} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <SelectedMapMover selected={selected} />
          {volcanoes.map((volcano) => {
            const color = markerColor(volcano);
            const isSelected = selected?.id === volcano.id;
            return (
              <CircleMarker
                key={volcano.id}
                center={[volcano.latitude, volcano.longitude]}
                radius={isSelected ? markerRadius(volcano) + 4 : markerRadius(volcano)}
                pathOptions={{
                  color: isSelected ? "#ffffff" : color,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.95 : 0.72,
                  opacity: 0.95,
                  weight: isSelected ? 2 : 1,
                }}
                eventHandlers={{ click: () => onSelect(volcano) }}
              >
                <Popup>
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-base font-semibold text-white">{volcano.name}</h3>
                      <p className="text-xs text-slate-400">{volcano.country} / {volcano.region}</p>
                    </div>
                    <VolcanoStatus volcano={volcano} />
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-300">
                      <dt className="text-slate-500">Coordinates</dt>
                      <dd>{volcano.latitude.toFixed(3)}, {volcano.longitude.toFixed(3)}</dd>
                      <dt className="text-slate-500">Elevation</dt>
                      <dd>{volcano.elevationMeters == null ? "Unknown" : `${volcano.elevationMeters.toLocaleString()} m`}</dd>
                      <dt className="text-slate-500">Type</dt>
                      <dd>{volcano.volcanoType}</dd>
                      <dt className="text-slate-500">Last eruption</dt>
                      <dd>{volcano.lastKnownEruption}</dd>
                    </dl>
                    <p className="text-xs text-slate-400">{alertLabel(volcano)}</p>
                    <button
                      className="w-full rounded-md bg-seismo/90 px-3 py-2 text-xs font-semibold text-basalt-950 transition hover:bg-seismo"
                      onClick={() => onSelect(volcano)}
                    >
                      Open detail panel
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </section>
  );
}
