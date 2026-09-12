import { describe, it, expect } from "vitest";
import { suggestFairWage } from "./pricing";

describe("suggestFairWage", () => {
  it("pays a higher wage in peak than shoulder than off season", () => {
    const base = { baseWagePaise: 100000 };
    const peak = suggestFairWage({ ...base, demandSeason: "PEAK" }).suggestedPaise;
    const shoulder = suggestFairWage({ ...base, demandSeason: "SHOULDER" }).suggestedPaise;
    const off = suggestFairWage({ ...base, demandSeason: "OFF" }).suggestedPaise;
    expect(peak).toBeGreaterThan(shoulder);
    expect(shoulder).toBeGreaterThan(off);
    expect(off).toBe(100000);
    expect(peak).toBe(115000);
  });

  it("returns a band around the suggestion", () => {
    const fw = suggestFairWage({ baseWagePaise: 100000, demandSeason: "OFF" });
    expect(fw.lowPaise).toBeLessThan(fw.suggestedPaise);
    expect(fw.highPaise).toBeGreaterThan(fw.suggestedPaise);
  });

  it("uses the median of history when provided", () => {
    const fw = suggestFairWage({ baseWagePaise: 999999, demandSeason: "OFF", history: [80000, 90000, 100000] });
    expect(fw.suggestedPaise).toBe(90000); // median, not the base
    expect(fw.reasons.some((r) => r.includes("recent"))).toBe(true);
  });
});
