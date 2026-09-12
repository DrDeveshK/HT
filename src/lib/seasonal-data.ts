import { prisma } from "@/lib/db";
import {
  nationalHeatmap,
  suggestCorridors,
  regionStateForMonth,
  currentMonth,
  type RegionPack,
  type RegionLike,
} from "@/core/seasonal";
import type { SeasonState } from "@/lib/constants";

/** Loads regions + seasonal packs and derives the national heatmap and corridors. */
export async function loadSeasonContext(month: number = currentMonth()) {
  const [regions, packsRaw] = await Promise.all([
    prisma.region.findMany({ orderBy: [{ zone: "asc" }, { name: "asc" }] }),
    prisma.seasonalPack.findMany(),
  ]);

  const packs: RegionPack[] = packsRaw.map((p) => ({
    regionId: p.regionId,
    month: p.month,
    state: p.state as SeasonState,
  }));

  const regionLikes: RegionLike[] = regions.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    zone: r.zone,
    dominantType: r.dominantType,
  }));

  const views = nationalHeatmap(regionLikes, packs, month);
  const corridors = suggestCorridors(views);
  const stateOf = (regionId: string): SeasonState => regionStateForMonth(packs, regionId, month);

  return { month, regions, packs, views, corridors, stateOf };
}

/** Sums open declaration headcounts per region, split by surplus vs demand. */
export async function openDeclarationCountsByRegion(): Promise<
  Record<string, { surplus: number; demand: number }>
> {
  const decls = await prisma.seasonDeclaration.findMany({
    where: { status: "OPEN" },
    include: { hotel: { select: { regionId: true } } },
  });
  const map: Record<string, { surplus: number; demand: number }> = {};
  for (const d of decls) {
    const rid = d.hotel.regionId;
    map[rid] ??= { surplus: 0, demand: 0 };
    if (d.type === "SURPLUS") map[rid].surplus += d.headcount;
    else map[rid].demand += d.headcount;
  }
  return map;
}
