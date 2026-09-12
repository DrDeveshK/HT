import type { SeasonState } from "@/lib/constants";

export interface MatchWorker {
  id: string;
  name: string;
  primaryRoleId: string;
  homeRegionId: string;
  homeRegionState: SeasonState; // is the worker's home region currently OFF/SHOULDER/PEAK?
  expectedWagePaise: number; // per day
  reputationScore: number; // 0-5
  experienceYears: number;
  availabilityStatus: string; // AVAILABLE | ON_DEPUTATION | UNAVAILABLE
  kycStatus: string; // PENDING | VERIFIED | REJECTED
  willingZones?: string[]; // zones the worker will relocate to (M2)
}

export interface MatchDemand {
  roleId: string;
  demandRegionId: string;
  wageOfferPaise: number; // per day
  housingProvided: boolean;
  demandZone?: string; // zone of the demanding hotel (M2)
}

export interface ScoredMatch {
  worker: MatchWorker;
  score: number; // 0-100
  reasons: string[];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Score a single worker against a demand. Role mismatch => null (hard filter). */
export function scoreMatch(worker: MatchWorker, demand: MatchDemand): ScoredMatch | null {
  if (worker.primaryRoleId !== demand.roleId) return null;
  if (worker.availabilityStatus !== "AVAILABLE") return null;

  const reasons: string[] = [];
  let score = 40; // base for a role + availability match
  reasons.push("Role matches and worker is available");

  // Counter-seasonal bonus — the whole point of HT.
  if (worker.homeRegionState === "OFF") {
    score += 25;
    reasons.push("Home region is OFF-season — ideal to lend");
  } else if (worker.homeRegionState === "SHOULDER") {
    score += 10;
    reasons.push("Home region is in shoulder season");
  }

  // Wage fit.
  if (demand.wageOfferPaise >= worker.expectedWagePaise) {
    score += 15;
    reasons.push("Offered wage meets expectation");
  } else {
    const shortfall = worker.expectedWagePaise - demand.wageOfferPaise;
    const penalty = clamp(Math.round((shortfall / Math.max(worker.expectedWagePaise, 1)) * 20), 0, 20);
    score -= penalty;
    reasons.push("Offered wage below expectation");
  }

  // Reputation (0-5 -> 0-15).
  score += clamp(worker.reputationScore, 0, 5) * 3;
  if (worker.reputationScore >= 4) reasons.push("Highly rated");

  // Experience (0-10y -> 0-10).
  score += clamp(worker.experienceYears, 0, 10);

  // Verified KYC.
  if (worker.kycStatus === "VERIFIED") {
    score += 5;
    reasons.push("KYC verified");
  }

  // Housing sweetener.
  if (demand.housingProvided) {
    score += 5;
    reasons.push("Housing provided");
  }

  // Relocation preference (M2): does the worker want to work in this zone?
  if (worker.willingZones && worker.willingZones.length > 0 && demand.demandZone) {
    if (worker.willingZones.includes(demand.demandZone)) {
      score += 5;
      reasons.push("Open to this region");
    } else {
      score -= 20;
      reasons.push("Outside worker's preferred regions");
    }
  }

  return { worker, score: clamp(Math.round(score), 0, 100), reasons };
}

/** Rank all workers for a demand (best first). */
export function rankMatches(workers: MatchWorker[], demand: MatchDemand): ScoredMatch[] {
  return workers
    .map((w) => scoreMatch(w, demand))
    .filter((m): m is ScoredMatch => m !== null)
    .sort((a, b) => b.score - a.score);
}
