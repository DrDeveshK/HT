import { describe, it, expect } from "vitest";
import { rankMatches, scoreMatch, type MatchWorker, type MatchDemand } from "./index";

const base: MatchWorker = {
  id: "w",
  name: "W",
  primaryRoleId: "housekeeping",
  homeRegionId: "goa",
  homeRegionState: "OFF",
  expectedWagePaise: 80000,
  reputationScore: 4.5,
  experienceYears: 5,
  availabilityStatus: "AVAILABLE",
  kycStatus: "VERIFIED",
};

const demand: MatchDemand = {
  roleId: "housekeeping",
  demandRegionId: "hills",
  wageOfferPaise: 90000,
  housingProvided: true,
};

describe("matching engine", () => {
  it("filters out role mismatch and unavailable workers", () => {
    expect(scoreMatch({ ...base, primaryRoleId: "cook" }, demand)).toBeNull();
    expect(scoreMatch({ ...base, availabilityStatus: "ON_DEPUTATION" }, demand)).toBeNull();
  });

  it("ranks counter-seasonal workers above peak-region ones", () => {
    const offWorker = { ...base, id: "off", homeRegionState: "OFF" as const };
    const peakWorker = { ...base, id: "peak", homeRegionState: "PEAK" as const };
    const ranked = rankMatches([peakWorker, offWorker], demand);
    expect(ranked[0].worker.id).toBe("off");
  });

  it("produces a 0-100 score with reasons", () => {
    const m = scoreMatch(base, demand)!;
    expect(m.score).toBeGreaterThan(0);
    expect(m.score).toBeLessThanOrEqual(100);
    expect(m.reasons.length).toBeGreaterThan(0);
  });

  // A mid-tier worker so bonuses register below the 100 clamp.
  const modest: MatchWorker = { ...base, reputationScore: 2, homeRegionState: "SHOULDER", experienceYears: 1, kycStatus: "PENDING" };

  it("rewards a high rehire rate", () => {
    const plain = scoreMatch(modest, demand)!;
    const loved = scoreMatch({ ...modest, rehireRate: 1 }, demand)!;
    expect(loved.score).toBeGreaterThan(plain.score);
    expect(loved.reasons.some((r) => r.includes("would-rehire"))).toBe(true);
  });

  it("ranks a previously-rehired worker above an equal newcomer", () => {
    const newcomer = { ...modest, id: "new" };
    const known = { ...modest, id: "known", previouslyRehiredByDemand: true };
    const ranked = rankMatches([newcomer, known], demand);
    expect(ranked[0].worker.id).toBe("known");
    expect(ranked[0].reasons.some((r) => r.includes("before"))).toBe(true);
  });
});
