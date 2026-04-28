# Volcano Monitoring Dashboard

A static-first, single-page volcano monitoring dashboard built with Vite, React, TypeScript, Tailwind CSS, and Leaflet.

## Data Strategy

Volcano monitoring data is not exposed as one clean global real-time API. This app therefore prioritizes reliability:

- **Bundled global catalog:** `public/data/volcanoes.json` is generated from NOAA NCEI's ArcGIS layer for "Volcano Locations [from Smithsonian]". It includes global volcano name, location, country, elevation, morphology, catalog status, and last-eruption code.
- **Bundled recent activity snapshot:** `src/data/weeklyReports.ts` contains a curated table snapshot from the Smithsonian/USGS Weekly Volcanic Activity Report for 16 April-22 April 2026.
- **Optional live overlay:** The app attempts to fetch the USGS elevated-volcano endpoint at runtime. If it is blocked by CORS, unavailable, or changed, the app falls back to bundled data.

Historical metadata, confirmed eruptive activity, unrest, aviation color codes, and satellite observations are labeled separately in the UI.

## Sources

- NOAA NCEI volcano products: https://www.ncei.noaa.gov/products/natural-hazards/tsunamis-earthquakes-volcanoes/volcanoes
- NOAA ArcGIS hazards layer: https://gis.ngdc.noaa.gov/arcgis/rest/services/web_mercator/hazards/MapServer/7
- Smithsonian Global Volcanism Program: https://volcano.si.edu/
- Smithsonian/USGS weekly report: https://volcano.si.edu/reports_weekly.cfm
- USGS Volcano Hazards Program API notes: https://volcanoes.usgs.gov/vsc/api/
- USGS elevated volcanoes endpoint: https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes

## Local Development

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Production Build

```bash
npm run build
npm run preview
```

## Updating Bundled Volcano Data

Regenerate `public/data/volcanoes.json` from NOAA:

```bash
npm run update:data
```

Review the resulting diff before publishing. The weekly activity snapshot is intentionally curated in `src/data/weeklyReports.ts`; update it manually from the Smithsonian/USGS weekly report so summaries remain clear and source-labeled.

## GitHub Pages Deployment

For a repository deployed at `https://USERNAME.github.io/REPOSITORY/`, build with:

```bash
VITE_BASE_PATH=/REPOSITORY/ npm run build
```

If deploying from GitHub Actions, set the same environment variable in the build step. If deploying at a user or organization root site, keep the base path as `/`.

### Manual Pages Setup

1. Create a new GitHub repository.
2. Push this project to the repository.
3. In GitHub, open **Settings > Pages**.
4. Choose **GitHub Actions** as the source.
5. Add a workflow that installs dependencies, runs `npm run build`, and uploads `dist`.
6. Open the Pages URL shown after the workflow completes.

## Notes and Limitations

- The Smithsonian Excel download is not used as a runtime dependency because automated command-line access can be blocked by Cloudflare.
- The USGS API documentation states these endpoints support USGS applications and should not be assumed to have guaranteed continuing support.
- The dashboard does not infer hazards from the Holocene catalog. If a volcano has no recent activity or alert record, it is shown as historical metadata only.
- NASA FIRMS thermal anomaly data is not included by default to avoid presenting satellite heat detections as confirmed eruptions.
