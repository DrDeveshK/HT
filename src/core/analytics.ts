import type { SeasonState } from "@/lib/constants";
import type { RegionPack } from "@/core/seasonal";

// ---- Cost savings (hotel value proof) ----
export interface SavingsAssumptions {
  rehireCostPaise: number; // cost to source a fresh seasonal worker
  retrainCostPaise: number; // cost to train them to standard
  idlePayrollRecoveryPct: number; // % of a lent wage bill that would otherwise be idle cost
}

export const DEFAULT_ASSUMPTIONS: SavingsAssumptions = {
  rehireCostPaise: 1500000, // ₹15,000
  retrainCostPaise: 800000, // ₹8,000
  idlePayrollRecoveryPct: 60,
};

export interface SavingsDeputation {
  wagePerDayPaise: number;
  days: number;
  side: "HOME" | "DEMAND"; // HOME = lent staff out, DEMAND = borrowed staff in
}

export interface SavingsResult {
  idleRecoveredPaise: number; // as a lender: idle off-season payroll turned into revenue
  avoidedRehirePaise: number; // as a borrower
  avoidedRetrainPaise: number; // as a borrower
  totalPaise: number;
  lent: number;
  borrowed: number;
}

export function computeSavings(deps: SavingsDeputation[], a: SavingsAssumptions): SavingsResult {
  let idleRecoveredPaise = 0;
  let avoidedRehirePaise = 0;
  let avoidedRetrainPaise = 0;
  let lent = 0;
  let borrowed = 0;
  for (const d of deps) {
    if (d.side === "HOME") {
      idleRecoveredPaise += Math.round((d.wagePerDayPaise * d.days * a.idlePayrollRecoveryPct) / 100);
      lent++;
    } else {
      avoidedRehirePaise += a.rehireCostPaise;
      avoidedRetrainPaise += a.retrainCostPaise;
      borrowed++;
    }
  }
  return {
    idleRecoveredPaise,
    avoidedRehirePaise,
    avoidedRetrainPaise,
    totalPaise: idleRecoveredPaise + avoidedRehirePaise + avoidedRetrainPaise,
    lent,
    borrowed,
  };
}

// ---- Worker income projection (follow-the-season) ----
export interface IncomeProjection {
  singlePaise: number; // earns only while the home region is in season
  followPaise: number; // earns year-round by following corridors
  upliftPaise: number;
  activeMonths: number;
  offMonths: number;
}

export function projectAnnualIncome(args: {
  wagePerDayPaise: number;
  homeStates: SeasonState[]; // 12 monthly states for the home region
  workDaysPerMonth?: number;
}): IncomeProjection {
  const workDays = args.workDaysPerMonth ?? 26;
  const activeMonths = args.homeStates.filter((s) => s !== "OFF").length;
  const offMonths = args.homeStates.filter((s) => s === "OFF").length;
  const singlePaise = args.wagePerDayPaise * workDays * activeMonths;
  const followPaise = args.wagePerDayPaise * workDays * args.homeStates.length;
  return { singlePaise, followPaise, upliftPaise: followPaise - singlePaise, activeMonths, offMonths };
}

// ---- Demand forecasting ----
/** The next PEAK month for a region within `horizon` months, or null. */
export function upcomingPeak(
  packs: RegionPack[],
  regionId: string,
  fromMonth: number,
  horizon = 4,
): { month: number; monthsAhead: number } | null {
  for (let i = 1; i <= horizon; i++) {
    const month = ((fromMonth - 1 + i) % 12) + 1;
    const pack = packs.find((p) => p.regionId === regionId && p.month === month);
    if (pack?.state === "PEAK") return { month, monthsAhead: i };
  }
  return null;
}
