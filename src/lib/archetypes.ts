import type { SeasonState } from "@/lib/constants";

export interface Archetype {
  label: string;
  dominantType: string;
  months: SeasonState[]; // Jan..Dec
}

const P: SeasonState = "PEAK";
const SH: SeasonState = "SHOULDER";
const O: SeasonState = "OFF";

// Shared with prisma/seed.ts — the seasonal profiles a hotspot can take.
export const ARCHETYPES: Record<string, Archetype> = {
  HIMALAYAN: { label: "Himalayan (summer peak)", dominantType: "MOUNTAIN", months: [O, O, SH, P, P, P, SH, SH, P, P, SH, O] },
  SKI: { label: "Ski / winter hill", dominantType: "MOUNTAIN", months: [P, P, P, SH, SH, O, O, O, SH, SH, P, P] },
  HILL: { label: "Hill station (summer)", dominantType: "HILL", months: [SH, SH, SH, P, P, P, O, O, SH, P, P, SH] },
  DESERT: { label: "Desert (winter peak)", dominantType: "DESERT", months: [P, P, SH, O, O, O, O, SH, SH, P, P, P] },
  WEST_COAST: { label: "West coast / beach", dominantType: "BEACH", months: [P, P, SH, SH, O, O, O, O, O, SH, P, P] },
  EAST_COAST: { label: "East coast / beach", dominantType: "BEACH", months: [P, P, SH, SH, O, O, SH, SH, SH, P, P, P] },
  BACKWATER: { label: "Backwater / south", dominantType: "BACKWATER", months: [P, P, SH, SH, O, O, O, SH, SH, SH, P, P] },
  PILGRIMAGE: { label: "Pilgrimage", dominantType: "PILGRIMAGE", months: [P, P, SH, SH, O, O, SH, SH, SH, P, P, P] },
  WILDLIFE: { label: "Wildlife (parks)", dominantType: "WILDLIFE", months: [P, P, P, P, SH, SH, O, O, O, SH, P, P] },
  HERITAGE: { label: "Heritage / city", dominantType: "HERITAGE", months: [P, P, SH, SH, O, O, SH, SH, SH, P, P, P] },
  METRO: { label: "Metro / business", dominantType: "BUSINESS", months: [SH, P, P, SH, O, O, SH, SH, P, P, P, SH] },
  ISLAND: { label: "Island", dominantType: "ISLAND", months: [P, P, P, SH, O, O, O, O, SH, SH, P, P] },
};

export const ZONES = ["NORTH", "WEST", "SOUTH", "EAST", "CENTRAL", "NORTHEAST", "ISLANDS"] as const;
