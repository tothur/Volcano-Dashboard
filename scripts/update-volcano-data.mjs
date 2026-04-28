import { mkdir, writeFile } from "node:fs/promises";

const NOAA_LAYER =
  "https://gis.ngdc.noaa.gov/arcgis/rest/services/web_mercator/hazards/MapServer/7/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson";
const NOAA_METADATA =
  "https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ngdc.mgg.hazards%3AG02135";
const GVP_HOLOCENE_LIST = "https://volcano.si.edu/volcanolist_holocene.cfm";

const eruptionCodeLabels = {
  D1: "1964 or later",
  D2: "1900-1963",
  D3: "1800-1899",
  D4: "1700-1799",
  D5: "1500-1699",
  D6: "A.D. 1-1499",
  D7: "B.C. Holocene",
  U: "Undated or unknown Holocene eruption",
  Q: "Quaternary",
  "?": "Unknown",
};

function normalizeId(value) {
  const raw = String(value ?? "").replace(/\D/g, "");
  return raw.length >= 6 ? raw : raw.padStart(6, "0");
}

function normalizeStatus(catalogStatus) {
  const status = String(catalogStatus ?? "").toLowerCase();
  if (status.includes("historical")) return "historical";
  if (status.includes("holocene")) return "holocene";
  return "unknown";
}

function formatEruptionCode(code) {
  const value = String(code ?? "").trim();
  return eruptionCodeLabels[value] ?? (value || "Unknown");
}

async function main() {
  const response = await fetch(NOAA_LAYER, {
    headers: {
      accept: "application/geo+json, application/json",
      "user-agent": "Volcano-Dashboard data updater",
    },
  });

  if (!response.ok) {
    throw new Error(`NOAA ArcGIS request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const features = Array.isArray(payload.features) ? payload.features : [];

  const volcanoes = features
    .map((feature) => {
      const props = feature.properties ?? {};
      const id = normalizeId(props.ID ?? props.OBJECTID);
      const latitude = Number(props.LATITUDE);
      const longitude = Number(props.LONGITUDE);

      return {
        id,
        name: String(props.NAME ?? "Unnamed volcano"),
        country: String(props.COUNTRY ?? "Unknown"),
        region: String(props.LOCATION ?? "Unknown"),
        latitude,
        longitude,
        elevationMeters: Number.isFinite(Number(props.ELEVATION)) ? Number(props.ELEVATION) : null,
        volcanoType: String(props.MORPHOLOGY ?? "Unknown"),
        lastKnownEruption: formatEruptionCode(props.TIME_ERUPT),
        status: normalizeStatus(props.STATUS),
        catalogStatus: String(props.STATUS ?? "Unknown"),
        alertLevel: "UNKNOWN",
        aviationColorCode: "UNKNOWN",
        sourceUrls: {
          smithsonian: GVP_HOLOCENE_LIST,
          noaa: NOAA_METADATA,
        },
        alertHistory: [],
      };
    })
    .filter((volcano) => Number.isFinite(volcano.latitude) && Number.isFinite(volcano.longitude))
    .sort((a, b) => a.name.localeCompare(b.name));

  const catalog = {
    metadata: {
      generatedAt: new Date().toISOString(),
      sourceName: "NOAA NCEI Global Volcano Locations Database, Smithsonian-derived volcano locations",
      sourceUrl: NOAA_LAYER,
      sourceNotes:
        "Downloaded from NOAA's ArcGIS layer for Volcano Locations [from Smithsonian]. The layer contains volcano name, location, elevation, morphology, catalog status, last-eruption code, and country.",
      recordCount: volcanoes.length,
    },
    volcanoes,
  };

  await mkdir("public/data", { recursive: true });
  await writeFile("public/data/volcanoes.json", `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Wrote ${volcanoes.length} volcano records to public/data/volcanoes.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
