type RegionName = "Europe" | "North America" | "South America" | "Asia" | "Oceania" | "Africa" | "Other";

const logoFiles: Record<RegionName, string> = {
  Europe: "europe",
  "North America": "north-america",
  "South America": "south-america",
  Asia: "asia",
  Oceania: "oceania",
  Africa: "africa",
  Other: "other",
};

export function RegionGlobeLogo({ region }: { region: RegionName }) {
  const src = `${import.meta.env.BASE_URL}images/region-globes/${logoFiles[region]}.png`;

  return <img className="h-12 w-12 object-contain" src={src} alt={`${region} Earth globe logo`} />;
}

export type { RegionName };
