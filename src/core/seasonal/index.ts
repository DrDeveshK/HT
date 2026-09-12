import type { SeasonState } from "@/lib/constants";

export interface RegionPack {
  regionId: string;
  month: number; // 1-12
  state: SeasonState;
}

export interface RegionLike {
  id: string;
  code: string;
  name: string;
  state: string;
  zone: string;
  dominantType: string;
}

export function currentMonth(date: Date = new Date()): number {
  return date.getMonth() + 1;
}

export function regionStateForMonth(
  packs: RegionPack[],
  regionId: string,
  month: number,
): SeasonState {
  const pack = packs.find((p) => p.regionId === regionId && p.month === month);
  return pack?.state ?? "SHOULDER";
}

export interface RegionSeasonView {
  region: RegionLike;
  state: SeasonState;
}

/** Current season state for every region — the national heatmap. */
export function nationalHeatmap(
  regions: RegionLike[],
  packs: RegionPack[],
  month: number,
): RegionSeasonView[] {
  return regions.map((region) => ({
    region,
    state: regionStateForMonth(packs, region.id, month),
  }));
}

export interface Corridor {
  from: RegionLike; // OFF-season region (labour surplus)
  to: RegionLike; // PEAK-season region (labour demand)
}

/**
 * Counter-seasonal corridors: pair every OFF region (staff to lend) with every
 * PEAK region (staff needed). This is the temporal-arbitrage core of HT.
 */
export function suggestCorridors(views: RegionSeasonView[]): Corridor[] {
  const off = views.filter((v) => v.state === "OFF");
  const peak = views.filter((v) => v.state === "PEAK");
  const corridors: Corridor[] = [];
  for (const o of off) {
    for (const p of peak) {
      corridors.push({ from: o.region, to: p.region });
    }
  }
  return corridors;
}
