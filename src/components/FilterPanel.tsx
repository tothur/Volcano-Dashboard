import { Search, SlidersHorizontal } from "lucide-react";
import type { Volcano } from "../types/volcano";

export interface Filters {
  region: string;
  country: string;
  volcanoType: string;
  alert: string;
  status: string;
  search: string;
}

interface FilterPanelProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  volcanoes: Volcano[];
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function FilterPanel({ filters, onFiltersChange, volcanoes }: FilterPanelProps) {
  const regions = unique(volcanoes.map((volcano) => volcano.region));
  const countries = unique(volcanoes.map((volcano) => volcano.country));
  const types = unique(volcanoes.map((volcano) => volcano.volcanoType));
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => onFiltersChange({ ...filters, [key]: value });

  return (
    <section className="rounded-lg border border-white/15 bg-basalt-950/75 p-2 shadow-glow backdrop-blur-md">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[auto_1.35fr_repeat(5,minmax(0,1fr))_auto] xl:items-end">
        <div className="hidden items-center gap-2 text-sm font-semibold uppercase text-slate-300 xl:flex">
          <SlidersHorizontal size={16} className="text-seismo" />
          Filters
        </div>
        <label className="md:col-span-2 xl:col-span-1">
          <span className="sr-only">Search by volcano name</span>
          <span className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-slate-500" />
            <input
              className="input h-9 pl-9"
              value={filters.search}
              onChange={(event) => update("search", event.target.value)}
              placeholder="Volcano name"
            />
          </span>
        </label>
        <label>
          <span className="sr-only">Region</span>
          <select className="input h-9" value={filters.region} onChange={(event) => update("region", event.target.value)}>
            <option value="all">All regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Country</span>
          <select className="input h-9" value={filters.country} onChange={(event) => update("country", event.target.value)}>
            <option value="all">All countries</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Type</span>
          <select className="input h-9" value={filters.volcanoType} onChange={(event) => update("volcanoType", event.target.value)}>
            <option value="all">All types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Alert</span>
          <select className="input h-9" value={filters.alert} onChange={(event) => update("alert", event.target.value)}>
            <option value="all">Any alert</option>
            <option value="WARNING">Warning / Red</option>
            <option value="WATCH">Watch / Orange</option>
            <option value="ADVISORY">Advisory / Yellow</option>
            <option value="UNKNOWN">No current alert</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Activity</span>
          <select className="input h-9" value={filters.status} onChange={(event) => update("status", event.target.value)}>
            <option value="all">Any status</option>
            <option value="confirmed-eruption">Confirmed eruption</option>
            <option value="unrest">Unrest</option>
            <option value="elevated-alert">USGS elevated alert</option>
            <option value="historical">Historical metadata</option>
            <option value="holocene">Holocene metadata</option>
          </select>
        </label>
        <button
          className="h-9 rounded-md border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-seismo/60 hover:text-white"
          onClick={() =>
            onFiltersChange({
              region: "all",
              country: "all",
              volcanoType: "all",
              alert: "all",
              status: "all",
              search: "",
            })
          }
        >
          Reset
        </button>
      </div>
    </section>
  );
}
