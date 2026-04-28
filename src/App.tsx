import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Flame,
  Globe2,
} from "lucide-react";
import { DetailPanel } from "./components/DetailPanel";
import { FilterPanel, type Filters } from "./components/FilterPanel";
import { RegionGlobeLogo, type RegionName } from "./components/RegionGlobeLogo";
import { VolcanoStatus } from "./components/StatusPill";
import { sortVolcanoes, type SortKey, VolcanoTable } from "./components/VolcanoTable";
import { VolcanoMap } from "./components/VolcanoMap";
import { weeklyReportMetadata } from "./data/weeklyReports";
import {
  fetchUsgsElevatedVolcanoes,
  loadBundledCatalog,
  mergeActivitySources,
  normalizeName,
} from "./lib/volcanoData";
import type { Volcano, VolcanoCatalogMetadata } from "./types/volcano";

const initialFilters: Filters = {
  region: "all",
  country: "all",
  volcanoType: "all",
  alert: "all",
  status: "all",
  search: "",
};

function matchesAlert(volcano: Volcano, alert: string) {
  if (alert === "all") return true;
  if (alert === "WARNING") return volcano.alertLevel === "WARNING" || volcano.aviationColorCode === "RED";
  if (alert === "WATCH") return volcano.alertLevel === "WATCH" || volcano.aviationColorCode === "ORANGE";
  if (alert === "ADVISORY") return volcano.alertLevel === "ADVISORY" || volcano.aviationColorCode === "YELLOW";
  return volcano.alertLevel === "UNKNOWN" && volcano.aviationColorCode === "UNKNOWN";
}

function applyFilters(volcanoes: Volcano[], filters: Filters) {
  const query = normalizeName(filters.search);
  return volcanoes.filter((volcano) => {
    if (filters.region !== "all" && volcano.region !== filters.region) return false;
    if (filters.country !== "all" && volcano.country !== filters.country) return false;
    if (filters.volcanoType !== "all" && volcano.volcanoType !== filters.volcanoType) return false;
    if (filters.status === "confirmed-eruption" && !volcano.latestReportType?.includes("Eruptive") && volcano.status !== "confirmed-eruption") return false;
    if (filters.status === "unrest" && !volcano.latestReportType?.includes("Unrest") && volcano.status !== "unrest") return false;
    if (filters.status === "elevated-alert" && volcano.alertLevel === "UNKNOWN" && volcano.aviationColorCode === "UNKNOWN") return false;
    if (filters.status === "historical" && volcano.catalogStatus !== "Historical") return false;
    if (filters.status === "holocene" && volcano.catalogStatus !== "Holocene") return false;
    if (!matchesAlert(volcano, filters.alert)) return false;
    if (query && !normalizeName(volcano.name).includes(query)) return false;
    return true;
  });
}

function EruptionWarningCard({
  erupting,
  metadata,
  usgsStatus,
}: {
  erupting: Volcano[];
  metadata?: VolcanoCatalogMetadata;
  usgsStatus: "loading" | "available" | "unavailable";
}) {
  return (
    <section className="panel overflow-hidden rounded-lg border-orange-400/30">
      <div className="grid gap-0 lg:grid-cols-[320px_1fr_260px]">
        <div className="bg-orange-500/12 p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-orange-500/20 p-3 text-orange-200">
              <Flame size={28} />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase text-orange-100">Erupting volcanoes</p>
              <p className="text-5xl font-semibold text-white">{erupting.length}</p>
            </div>
          </div>
        </div>
        <div>
          <div className="p-5">
            <h2 className="text-xl font-semibold text-white">Current eruption activity from the weekly report</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Counted from bundled Smithsonian/USGS reports labeled New Eruptive Activity or Continuing Eruptive Activity for{" "}
              {weeklyReportMetadata.reportPeriod}. This is report-driven activity, not inferred from historical metadata.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 p-5 lg:border-l lg:border-t-0">
          <p className="label">Data freshness</p>
          <p className="mt-2 text-sm text-slate-200">{metadata ? new Date(metadata.generatedAt).toLocaleDateString() : "Loading catalog"}</p>
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                usgsStatus === "available" ? "bg-seismo" : usgsStatus === "loading" ? "bg-yellow-300" : "bg-slate-500"
              }`}
            />
            USGS overlay {usgsStatus === "available" ? "available" : usgsStatus === "loading" ? "checking" : "unavailable"}
          </p>
        </div>
      </div>
    </section>
  );
}

const REGION_ORDER: RegionName[] = ["Europe", "North America", "South America", "Asia", "Oceania", "Africa", "Other"];

const REGION_STYLE: Record<RegionName, { accent: string; label: string }> = {
  Europe: {
    accent: "border-sky-300/30 bg-sky-400/10 text-sky-100",
    label: "European observatories and island arcs",
  },
  "North America": {
    accent: "border-orange-300/30 bg-orange-400/10 text-orange-100",
    label: "North America, Central America, Caribbean, and Hawaii",
  },
  "South America": {
    accent: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
    label: "Andean volcanic arc",
  },
  Asia: {
    accent: "border-red-300/30 bg-red-400/10 text-red-100",
    label: "Asian island arcs and continental volcanoes",
  },
  Oceania: {
    accent: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
    label: "Pacific island arcs",
  },
  Africa: {
    accent: "border-yellow-300/30 bg-yellow-400/10 text-yellow-100",
    label: "African rifts and island volcanoes",
  },
  Other: {
    accent: "border-slate-300/30 bg-slate-400/10 text-slate-100",
    label: "Unclassified region",
  },
};

const EUROPEAN_ACTIVE_VOLCANOES = [
  {
    name: "Etna",
    rank: "Frequent summit eruptions",
    context: "One of Europe's most persistently active volcanoes, with recurring lava fountains, ash emissions, and summit-crater activity.",
  },
  {
    name: "Stromboli",
    rank: "Persistent explosive activity",
    context: "Known for long-lived Strombolian explosions and intermittent lava-flow or paroxysmal episodes.",
  },
  {
    name: "Campi Flegrei",
    rank: "Caldera unrest",
    context: "A densely monitored caldera near Naples where ground deformation and seismic swarms make unrest status especially important.",
  },
  {
    name: "Vesuvius",
    rank: "High-consequence active volcano",
    context: "Not currently listed as erupting here, but historically active and closely watched because of exposure around Naples.",
  },
  {
    name: "Fagradalsfjall",
    rank: "Recent Reykjanes activity",
    context: "Part of Iceland's recently active Reykjanes volcanic systems, with fissure eruptions in the modern activity cycle.",
  },
  {
    name: "Grimsvotn",
    rank: "Frequently active Icelandic system",
    context: "A subglacial caldera system with repeated historical eruptions and aviation-relevant ash potential.",
  },
  {
    name: "Hekla",
    rank: "Historically frequent eruptions",
    context: "A historically active Icelandic stratovolcano with short-warning eruption behavior.",
  },
  {
    name: "Katla",
    rank: "Major monitored subglacial volcano",
    context: "A large Icelandic system monitored for seismicity, geothermal changes, and potential outburst-flood-producing eruptions.",
  },
  {
    name: "Santorini",
    rank: "Aegean caldera system",
    context: "A historically active caldera in Greece with important seismic and volcanic monitoring relevance.",
  },
  {
    name: "La Palma",
    rank: "Recent Canary Islands eruption",
    context: "Site of the 2021 Cumbre Vieja eruption and one of the key active volcanic islands in the Canaries.",
  },
  {
    name: "Tenerife",
    rank: "Canary Islands active system",
    context: "Includes Teide-Pico Viejo volcanic system; historically active and closely monitored because of island exposure.",
  },
  {
    name: "Pico",
    rank: "Azores unrest watch",
    context: "Azores stratovolcano included because recent weekly reporting has noted unrest context in the region.",
  },
];

function worldRegionFor(volcano: Volcano): RegionName {
  const country = volcano.country;
  const region = volcano.region.toLowerCase();

  if (["Portugal", "Iceland", "Italy", "Greece", "Spain", "France"].includes(country)) return "Europe";
  if (country === "Russia" && !region.includes("kuril") && !region.includes("kamchatka")) return "Europe";

  if (
    [
      "United States",
      "Canada",
      "Mexico",
      "Costa Rica",
      "Guatemala",
      "Nicaragua",
      "El Salvador",
      "Panama",
      "Dominica",
      "Montserrat",
      "St. Vincent & the Grenadines",
      "Grenada",
      "Netherlands",
    ].includes(country) ||
    region.includes("alaska") ||
    region.includes("hawai") ||
    region.includes("w indies")
  ) {
    return "North America";
  }

  if (["Chile", "Peru", "Ecuador", "Colombia", "Argentina", "Bolivia"].includes(country)) return "South America";
  if (["Vanuatu", "Tonga", "Papua New Guinea", "New Zealand", "Solomon Islands", "Fiji", "Samoa"].includes(country)) return "Oceania";
  if (["Ethiopia", "Kenya", "Tanzania", "DR Congo", "Cameroon", "Eritrea", "Comoros"].includes(country) || region.includes("africa")) return "Africa";
  if (country === "Antarctica") return "Other";
  return "Asia";
}

function EuropeanVolcanoesSection({ volcanoes, onSelect }: { volcanoes: Volcano[]; onSelect: (volcano: Volcano) => void }) {
  const featured = EUROPEAN_ACTIVE_VOLCANOES.map((item) => {
    const volcano = volcanoes.find((candidate) => candidate.name === item.name);
    return volcano ? { ...item, volcano } : null;
  }).filter((item): item is (typeof EUROPEAN_ACTIVE_VOLCANOES)[number] & { volcano: Volcano } => Boolean(item));

  if (!featured.length) return null;

  return (
    <section className="panel rounded-lg p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-lg border border-sky-300/30 bg-sky-400/10">
            <RegionGlobeLogo region="Europe" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">European volcanoes to watch</h2>
            <p className="text-sm text-slate-400">Most active or closely monitored European systems from the bundled catalog.</p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
          {featured.length} featured
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {featured.map(({ volcano, rank, context }) => (
          <article key={volcano.id} className="rounded-lg border border-white/10 bg-basalt-950/55 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">{volcano.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{volcano.country} / {volcano.region}</p>
              </div>
              <VolcanoStatus volcano={volcano} />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase text-sky-100">{rank}</p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{context}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                <dt className="text-slate-500">Type</dt>
                <dd className="mt-1 text-slate-200">{volcano.volcanoType}</dd>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                <dt className="text-slate-500">Last eruption</dt>
                <dd className="mt-1 text-slate-200">{volcano.lastKnownEruption}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">{volcano.latestReportDate ?? "Catalog metadata"}</span>
              <button className="text-sm font-semibold text-seismo hover:text-white" onClick={() => onSelect(volcano)}>
                Details
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EruptingVolcanoCards({ volcanoes, onSelect }: { volcanoes: Volcano[]; onSelect: (volcano: Volcano) => void }) {
  if (!volcanoes.length) {
    return (
      <section className="panel rounded-lg p-5">
        <h2 className="text-lg font-semibold text-white">Currently erupting volcanoes</h2>
        <p className="mt-2 text-sm text-slate-400">No confirmed eruptive activity is listed in the selected weekly snapshot.</p>
      </section>
    );
  }

  const groups = REGION_ORDER.map((region) => ({
    region,
    volcanoes: volcanoes.filter((volcano) => worldRegionFor(volcano) === region),
  })).filter((group) => group.volcanoes.length > 0);

  return (
    <section className="panel rounded-lg p-4">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Currently erupting volcanoes</h2>
          <p className="text-sm text-slate-400">Cards are sourced from the latest bundled Smithsonian/USGS weekly activity snapshot.</p>
        </div>
      </div>
      <div className="space-y-5">
        {groups.map((group) => {
          const style = REGION_STYLE[group.region] ?? REGION_STYLE.Other;

          return (
            <section key={group.region} className="rounded-lg border border-white/10 bg-basalt-950/45 p-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-14 w-14 items-center justify-center rounded-lg border ${style.accent}`}>
                    <RegionGlobeLogo region={group.region} />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-white">{group.region}</h3>
                    <p className="text-xs text-slate-400">{style.label}</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                  {group.volcanoes.length} erupting
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                {group.volcanoes.map((volcano) => (
                  <button
                    key={volcano.id}
                    className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-seismo/60 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-seismo/60"
                    onClick={() => onSelect(volcano)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-semibold text-white">{volcano.name}</h4>
                        <p className="mt-1 text-xs text-slate-400">{volcano.country} / {volcano.region}</p>
                      </div>
                      <VolcanoStatus volcano={volcano} />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{volcano.latestReportDate ?? weeklyReportMetadata.reportDate}</p>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export default function App() {
  const [volcanoes, setVolcanoes] = useState<Volcano[]>([]);
  const [metadata, setMetadata] = useState<VolcanoCatalogMetadata>();
  const [selectedId, setSelectedId] = useState<string>();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [sortKey, setSortKey] = useState<SortKey>("report");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isTableCollapsed, setIsTableCollapsed] = useState(true);
  const [catalogError, setCatalogError] = useState<string>();
  const [usgsStatus, setUsgsStatus] = useState<"loading" | "available" | "unavailable">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        const catalog = await loadBundledCatalog();
        setMetadata(catalog.metadata);
        const base = mergeActivitySources(catalog.volcanoes);
        setVolcanoes(base);

        try {
          const usgsElevated = await fetchUsgsElevatedVolcanoes(controller.signal);
          const merged = mergeActivitySources(catalog.volcanoes, usgsElevated);
          setVolcanoes(merged);
          setUsgsStatus("available");
        } catch {
          setUsgsStatus("unavailable");
        }
      } catch (error) {
        setCatalogError(error instanceof Error ? error.message : "Unable to load volcano data.");
        setUsgsStatus("unavailable");
      }
    }

    loadData();
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => applyFilters(volcanoes, filters), [volcanoes, filters]);
  const sorted = useMemo(() => sortVolcanoes(filtered, sortKey, sortDirection), [filtered, sortDirection, sortKey]);
  const selected = volcanoes.find((volcano) => volcano.id === selectedId);
  const eruptingVolcanoes = useMemo(
    () =>
      volcanoes
        .filter((volcano) => volcano.latestReportType?.includes("Eruptive"))
        .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [volcanoes],
  );

  function handleSortChange(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-white/10 bg-basalt-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase text-orange-100">
                <Globe2 size={14} /> Global volcanic activity
              </div>
              <h1 className="text-3xl font-semibold text-white md:text-5xl">Volcano Monitoring Dashboard</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {catalogError ? (
          <section className="panel rounded-lg border-red-400/40 p-5 text-red-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5" />
              <div>
                <h2 className="font-semibold">Volcano catalog could not be loaded</h2>
                <p className="mt-1 text-sm text-red-100/80">{catalogError}</p>
              </div>
            </div>
          </section>
        ) : null}

        <EruptionWarningCard erupting={eruptingVolcanoes} metadata={metadata} usgsStatus={volcanoes.length ? usgsStatus : "loading"} />
        <EruptingVolcanoCards volcanoes={eruptingVolcanoes} onSelect={(volcano) => setSelectedId(volcano.id)} />
        <EuropeanVolcanoesSection volcanoes={volcanoes} onSelect={(volcano) => setSelectedId(volcano.id)} />
        <FilterPanel filters={filters} onFiltersChange={setFilters} volcanoes={volcanoes} />

        <VolcanoMap volcanoes={sorted} selected={selected} onSelect={(volcano) => setSelectedId(volcano.id)} />
        <VolcanoTable
          volcanoes={sorted}
          selectedId={selected?.id}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onSelect={(volcano) => setSelectedId(volcano.id)}
          collapsed={isTableCollapsed}
          onToggle={() => setIsTableCollapsed((value) => !value)}
        />
        <DetailPanel volcano={selected} onClose={() => setSelectedId(undefined)} />

        <footer className="pb-8 text-xs leading-6 text-slate-500">
          <p className="text-sm text-slate-400">
            Current eruptive activity, unrest, USGS alert overlays, and global Holocene volcano metadata in one operational view.
          </p>
          <p className="text-sm text-slate-400">Made by András Tóth and GPT-5.5.</p>
          <p>
            Smithsonian weekly snapshot: {weeklyReportMetadata.reportPeriod}. Historical metadata is not a live hazard assessment.
            Satellite thermal observations, where mentioned, are labeled as observations rather than confirmed eruptions.
          </p>
          <p>
            Source links: <a className="text-seismo hover:text-white" href="https://www.ncei.noaa.gov/products/natural-hazards/tsunamis-earthquakes-volcanoes/volcanoes" target="_blank" rel="noreferrer">NOAA NCEI</a>,{" "}
            <a className="text-seismo hover:text-white" href="https://volcano.si.edu/reports_weekly.cfm" target="_blank" rel="noreferrer">Smithsonian/GVP Weekly Report</a>,{" "}
            <a className="text-seismo hover:text-white" href="https://volcanoes.usgs.gov/vsc/api/" target="_blank" rel="noreferrer">USGS Volcano APIs</a>.
          </p>
        </footer>
      </div>
    </main>
  );
}
