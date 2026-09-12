import { describe, it, expect } from "vitest";
import { computeSavings, projectAnnualIncome, upcomingPeak, DEFAULT_ASSUMPTIONS } from "./analytics";
import type { RegionPack } from "./seasonal";
import type { SeasonState } from "@/lib/constants";

describe("computeSavings", () => {
  it("recovers idle payroll for lent staff and avoids rehire/retrain for borrowed", () => {
    const r = computeSavings(
      [
        { wagePerDayPaise: 100000, days: 90, side: "HOME" }, // 100000*90*60% = 5,400,000
        { wagePerDayPaise: 90000, days: 30, side: "DEMAND" },
      ],
      DEFAULT_ASSUMPTIONS,
    );
    expect(r.idleRecoveredPaise).toBe(5400000);
    expect(r.avoidedRehirePaise).toBe(DEFAULT_ASSUMPTIONS.rehireCostPaise);
    expect(r.avoidedRetrainPaise).toBe(DEFAULT_ASSUMPTIONS.retrainCostPaise);
    expect(r.totalPaise).toBe(5400000 + DEFAULT_ASSUMPTIONS.rehireCostPaise + DEFAULT_ASSUMPTIONS.retrainCostPaise);
    expect(r.lent).toBe(1);
    expect(r.borrowed).toBe(1);
  });
});

describe("projectAnnualIncome", () => {
  it("follow-the-season beats single-season by the off-months' income", () => {
    const homeStates: SeasonState[] = ["PEAK", "PEAK", "OFF", "OFF", "SHOULDER", "PEAK", "PEAK", "OFF", "SHOULDER", "PEAK", "PEAK", "OFF"];
    const p = projectAnnualIncome({ wagePerDayPaise: 100000, homeStates, workDaysPerMonth: 26 });
    expect(p.offMonths).toBe(4);
    expect(p.activeMonths).toBe(8);
    expect(p.followPaise).toBeGreaterThan(p.singlePaise);
    expect(p.upliftPaise).toBe(100000 * 26 * 4); // the 4 off months become earning months
  });
});

describe("upcomingPeak", () => {
  const packs: RegionPack[] = [
    { regionId: "r", month: 5, state: "SHOULDER" },
    { regionId: "r", month: 6, state: "PEAK" },
  ];
  it("flags a peak within the horizon", () => {
    expect(upcomingPeak(packs, "r", 4, 4)).toEqual({ month: 6, monthsAhead: 2 });
  });
  it("returns null when no peak is near", () => {
    expect(upcomingPeak(packs, "r", 6, 3)).toBeNull();
  });
});
