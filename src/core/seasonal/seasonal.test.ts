import { describe, it, expect } from "vitest";
import {
  regionStateForMonth,
  nationalHeatmap,
  suggestCorridors,
  type RegionLike,
  type RegionPack,
} from "./index";

const goa: RegionLike = { id: "goa", code: "GOA", name: "Goa", zone: "WEST", dominantType: "BEACH" };
const hills: RegionLike = { id: "hills", code: "HP", name: "Himachal Hills", zone: "NORTH", dominantType: "MOUNTAIN" };

const packs: RegionPack[] = [
  { regionId: "goa", month: 7, state: "OFF" }, // monsoon
  { regionId: "goa", month: 12, state: "PEAK" },
  { regionId: "hills", month: 7, state: "PEAK" }, // summer
  { regionId: "hills", month: 12, state: "OFF" }, // winter snow
];

describe("seasonal engine", () => {
  it("returns pack state and defaults to SHOULDER when missing", () => {
    expect(regionStateForMonth(packs, "goa", 7)).toBe("OFF");
    expect(regionStateForMonth(packs, "goa", 3)).toBe("SHOULDER");
  });

  it("pairs OFF regions with PEAK regions into corridors (summer)", () => {
    const views = nationalHeatmap([goa, hills], packs, 7); // goa OFF, hills PEAK
    const corridors = suggestCorridors(views);
    expect(corridors).toHaveLength(1);
    expect(corridors[0].from.id).toBe("goa");
    expect(corridors[0].to.id).toBe("hills");
  });

  it("reverses the corridor in winter", () => {
    const views = nationalHeatmap([goa, hills], packs, 12); // goa PEAK, hills OFF
    const corridors = suggestCorridors(views);
    expect(corridors[0].from.id).toBe("hills");
    expect(corridors[0].to.id).toBe("goa");
  });
});
