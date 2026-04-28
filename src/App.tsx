import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Flame,
  Globe2,
  Monitor,
  Moon,
  Sun,
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

type ThemePreference = "auto" | "dark" | "light";

function getStoredThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem("volcano-dashboard-theme");
    return stored === "dark" || stored === "light" || stored === "auto" ? stored : "auto";
  } catch {
    return "auto";
  }
}

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

function ThemeSelector({
  value,
  onChange,
}: {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}) {
  const options = [
    { value: "auto" as const, label: "Auto", icon: <Monitor size={15} /> },
    { value: "dark" as const, label: "Dark", icon: <Moon size={15} /> },
    { value: "light" as const, label: "Light", icon: <Sun size={15} /> },
  ];

  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.045] p-1 shadow-glow backdrop-blur" aria-label="Theme selector">
      {options.map((option) => (
        <button
          key={option.value}
          className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
            value === option.value ? "bg-seismo text-basalt-950" : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
          }`}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function EruptionWarningCard({
  erupting,
  metadata,
}: {
  erupting: Volcano[];
  metadata?: VolcanoCatalogMetadata;
}) {
  return (
    <section className="panel overflow-hidden rounded-lg border-orange-400/30">
      <div className="flex flex-col gap-4 bg-orange-500/10 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-orange-500/20 p-3 text-orange-200">
            <Flame size={24} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-orange-100">Erupting volcanoes</p>
            <div className="flex items-baseline gap-3">
              <p className="text-4xl font-semibold text-white">{erupting.length}</p>
              <h2 className="text-lg font-semibold text-white">New Eruptive Activity or Continuing Eruptive Activity</h2>
            </div>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-basalt-950/65 px-3 py-1.5 text-xs font-semibold text-slate-200">
          {weeklyReportMetadata.reportPeriod}
          <span className="h-1 w-1 rounded-full bg-slate-500" />
          Data refreshed {metadata ? new Date(metadata.generatedAt).toLocaleDateString() : "loading"}
        </span>
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
              <div className="space-y-3">
                {Array.from(new Set(group.volcanoes.map((volcano) => volcano.country)))
                  .sort((a, b) => a.localeCompare(b))
                  .map((country) => {
                    const countryVolcanoes = group.volcanoes.filter((volcano) => volcano.country === country);

                    return (
                      <section key={`${group.region}-${country}`} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-200">{country}</h4>
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-400">
                            {countryVolcanoes.length}
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                          {countryVolcanoes.map((volcano) => (
                            <button
                              key={volcano.id}
                              className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-seismo/60 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-seismo/60"
                              onClick={() => onSelect(volcano)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h5 className="text-base font-semibold text-white">{volcano.name}</h5>
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
  const [themePreference, setThemePreference] = useState<ThemePreference>(getStoredThemePreference);

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

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const effectiveTheme = themePreference === "auto" ? (media.matches ? "dark" : "light") : themePreference;
      document.documentElement.dataset.theme = effectiveTheme;
      document.documentElement.style.colorScheme = effectiveTheme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", effectiveTheme === "light" ? "#f8fafc" : "#0d1219");
      localStorage.setItem("volcano-dashboard-theme", themePreference);
    }

    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [themePreference]);

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
            <ThemeSelector value={themePreference} onChange={setThemePreference} />
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

        <EruptionWarningCard erupting={eruptingVolcanoes} metadata={metadata} />
        <EruptingVolcanoCards volcanoes={eruptingVolcanoes} onSelect={(volcano) => setSelectedId(volcano.id)} />

        <VolcanoMap
          volcanoes={sorted}
          selected={selected}
          onSelect={(volcano) => setSelectedId(volcano.id)}
          controls={<FilterPanel filters={filters} onFiltersChange={setFilters} volcanoes={volcanoes} />}
        />
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

        <footer className="border-t border-white/10 py-8 text-center">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm text-slate-300">
              Current eruptive activity, unrest, USGS alert overlays, and global Holocene volcano metadata in one operational view.
            </p>
            <p className="mt-1 text-sm text-slate-400">Made by András Tóth and GPT-5.5.</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">{weeklyReportMetadata.reportPeriod}</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:inline-block" />
              <a className="text-seismo hover:text-white" href="https://www.ncei.noaa.gov/products/natural-hazards/tsunamis-earthquakes-volcanoes/volcanoes" target="_blank" rel="noreferrer">NOAA NCEI</a>
              <a className="text-seismo hover:text-white" href="https://volcano.si.edu/reports_weekly.cfm" target="_blank" rel="noreferrer">Smithsonian/GVP</a>
              <a className="text-seismo hover:text-white" href="https://volcanoes.usgs.gov/vsc/api/" target="_blank" rel="noreferrer">USGS APIs</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
