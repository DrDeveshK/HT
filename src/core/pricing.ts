import type { SeasonState } from "@/lib/constants";

export interface FairWageArgs {
  baseWagePaise: number; // role baseline (expected wage or declared offer)
  demandSeason: SeasonState; // PEAK | SHOULDER | OFF at the borrowing region
  history?: number[]; // recent accepted wages (paise) for this role/corridor
}

export interface FairWage {
  suggestedPaise: number;
  lowPaise: number;
  highPaise: number;
  reasons: string[];
}

// Peak regions pay a scarcity premium; that premium is the whole point of HT.
const SEASON_PREMIUM: Record<SeasonState, number> = { PEAK: 0.15, SHOULDER: 0.05, OFF: 0 };

function median(ns: number[]): number {
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** Suggest a fair per-day wage + a negotiation band. Pure + deterministic. */
export function suggestFairWage(args: FairWageArgs): FairWage {
  const reasons: string[] = [];
  let base = Math.max(0, Math.round(args.baseWagePaise));
  if (args.history && args.history.length > 0) {
    base = median(args.history);
    reasons.push(`Based on ${args.history.length} recent placement${args.history.length > 1 ? "s" : ""}`);
  } else {
    reasons.push("Based on the role's expected wage");
  }
  const premium = SEASON_PREMIUM[args.demandSeason];
  if (premium > 0) {
    reasons.push(`+${Math.round(premium * 100)}% ${args.demandSeason.toLowerCase()}-season premium at the host region`);
  }
  const suggested = Math.round(base * (1 + premium));
  return {
    suggestedPaise: suggested,
    lowPaise: Math.round(suggested * 0.9),
    highPaise: Math.round(suggested * 1.1),
    reasons,
  };
}
