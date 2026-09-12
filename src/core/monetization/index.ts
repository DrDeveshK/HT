// Modular monetization: one catalog of revenue modules, each independently
// enabled/disabled with configurable rates. The FeeEngine honours only the
// ENABLED modules when computing a deputation's money split.

export type Party = "DEMAND_HOTEL" | "HOME_HOTEL" | "WORKER" | "PLATFORM";

export interface RevenueModuleDef {
  key: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  defaultConfig: Record<string, number>;
  perDeputation: boolean; // does it affect per-deputation charges?
  sortOrder: number;
}

/** Single source of truth for every revenue stream. Seeded into RevenueModule. */
export const REVENUE_MODULE_CATALOG: RevenueModuleDef[] = [
  {
    key: "subscription",
    name: "Subscription (SaaS)",
    description: "Tiered monthly plan per property. The core revenue stream.",
    defaultEnabled: true,
    defaultConfig: {},
    perDeputation: false,
    sortOrder: 1,
  },
  {
    key: "deputation_commission",
    name: "Deputation commission",
    description:
      "Platform fee on each deputation's wage bill, plus an optional lending fee paid to the home hotel.",
    defaultEnabled: true,
    defaultConfig: { percent: 15, flatPaise: 0, homeHotelSharePercent: 0 },
    perDeputation: true,
    sortOrder: 2,
  },
  {
    key: "verification",
    name: "Verification & onboarding",
    description: "Per-worker KYC / background / police-verification fee.",
    defaultEnabled: false,
    defaultConfig: { flatPaise: 50000 },
    perDeputation: true,
    sortOrder: 3,
  },
  {
    key: "managed_payroll",
    name: "Managed payroll / EOR",
    description:
      "Platform runs payroll + inter-state compliance during deputation; margin on the wage bill.",
    defaultEnabled: false,
    defaultConfig: { marginPercent: 8 },
    perDeputation: true,
    sortOrder: 4,
  },
  {
    key: "insurance",
    name: "Insurance",
    description: "Worker accident/health cover for the deputation period.",
    defaultEnabled: false,
    defaultConfig: { perDayPaise: 1500 },
    perDeputation: true,
    sortOrder: 5,
  },
  {
    key: "travel",
    name: "Travel & relocation",
    description: "Travel booking + relocation markup.",
    defaultEnabled: false,
    defaultConfig: { flatPaise: 120000 },
    perDeputation: true,
    sortOrder: 6,
  },
  {
    key: "fintech",
    name: "Fintech (EWA / wallet)",
    description: "Earned-wage access, wallet, savings, micro-credit for workers.",
    defaultEnabled: false,
    defaultConfig: {},
    perDeputation: false,
    sortOrder: 7,
  },
  {
    key: "skilling",
    name: "Skilling & certification",
    description: "Course marketplace (Skill India / Hunar tie-in).",
    defaultEnabled: false,
    defaultConfig: {},
    perDeputation: false,
    sortOrder: 8,
  },
  {
    key: "promoted",
    name: "Promoted listings",
    description: "Featured supply/demand posts in the marketplace.",
    defaultEnabled: false,
    defaultConfig: {},
    perDeputation: false,
    sortOrder: 9,
  },
  {
    key: "data",
    name: "Data & analytics",
    description: "Seasonal labour-demand intelligence sold to chains / tourism boards.",
    defaultEnabled: false,
    defaultConfig: {},
    perDeputation: false,
    sortOrder: 10,
  },
];

export interface RevenueModuleState {
  key: string;
  enabled: boolean;
  config: Record<string, number>;
}

export interface ChargeContext {
  wagePerDayPaise: number;
  days: number;
  housingProvided: boolean;
}

export interface ChargeLine {
  moduleKey: string;
  label: string;
  fromParty: Party;
  toParty: Party;
  amountPaise: number;
}

export interface ChargeTotals {
  wageBillPaise: number;
  borrowerPaysPaise: number;
  workerGetsPaise: number;
  homeHotelGetsPaise: number;
  platformRevenuePaise: number;
}

export interface ChargeResult {
  days: number;
  lines: ChargeLine[];
  totals: ChargeTotals;
}

type ComputerCtx = ChargeContext & { wageBillPaise: number };
type ModuleComputer = (ctx: ComputerCtx, cfg: Record<string, number>) => ChargeLine[];

const pct = (base: number, percent: number) => Math.round((base * (percent || 0)) / 100);

const MODULE_COMPUTERS: Record<string, ModuleComputer> = {
  deputation_commission: (ctx, cfg) => {
    const lines: ChargeLine[] = [];
    const commission = pct(ctx.wageBillPaise, cfg.percent ?? 0) + (cfg.flatPaise ?? 0);
    if (commission > 0) {
      lines.push({
        moduleKey: "deputation_commission",
        label: `Platform commission (${cfg.percent ?? 0}%${cfg.flatPaise ? " + flat" : ""})`,
        fromParty: "DEMAND_HOTEL",
        toParty: "PLATFORM",
        amountPaise: commission,
      });
    }
    const lendingFee = pct(ctx.wageBillPaise, cfg.homeHotelSharePercent ?? 0);
    if (lendingFee > 0) {
      lines.push({
        moduleKey: "deputation_commission",
        label: `Lending fee to home hotel (${cfg.homeHotelSharePercent}%)`,
        fromParty: "DEMAND_HOTEL",
        toParty: "HOME_HOTEL",
        amountPaise: lendingFee,
      });
    }
    return lines;
  },
  verification: (_ctx, cfg) =>
    (cfg.flatPaise ?? 0) > 0
      ? [
          {
            moduleKey: "verification",
            label: "Verification & onboarding fee",
            fromParty: "DEMAND_HOTEL",
            toParty: "PLATFORM",
            amountPaise: cfg.flatPaise,
          },
        ]
      : [],
  managed_payroll: (ctx, cfg) => {
    const margin = pct(ctx.wageBillPaise, cfg.marginPercent ?? 0);
    return margin > 0
      ? [
          {
            moduleKey: "managed_payroll",
            label: `Managed payroll / EOR margin (${cfg.marginPercent}%)`,
            fromParty: "DEMAND_HOTEL",
            toParty: "PLATFORM",
            amountPaise: margin,
          },
        ]
      : [];
  },
  insurance: (ctx, cfg) => {
    const premium = (cfg.perDayPaise ?? 0) * ctx.days;
    return premium > 0
      ? [
          {
            moduleKey: "insurance",
            label: `Insurance premium (${ctx.days} days)`,
            fromParty: "DEMAND_HOTEL",
            toParty: "PLATFORM",
            amountPaise: premium,
          },
        ]
      : [];
  },
  travel: (_ctx, cfg) =>
    (cfg.flatPaise ?? 0) > 0
      ? [
          {
            moduleKey: "travel",
            label: "Travel & relocation",
            fromParty: "DEMAND_HOTEL",
            toParty: "PLATFORM",
            amountPaise: cfg.flatPaise,
          },
        ]
      : [],
};

function sumTo(lines: ChargeLine[], party: Party): number {
  return lines.filter((l) => l.toParty === party).reduce((s, l) => s + l.amountPaise, 0);
}
function sumFrom(lines: ChargeLine[], party: Party): number {
  return lines.filter((l) => l.fromParty === party).reduce((s, l) => s + l.amountPaise, 0);
}

/**
 * Compute the full money split for a deputation, honouring only enabled modules.
 * Flipping a module off in admin => its lines disappear here. That is the whole
 * "toggle any revenue stream on/off" mechanism, in one place.
 */
export function computeCharges(
  modules: RevenueModuleState[],
  ctx: ChargeContext,
): ChargeResult {
  const wageBillPaise = ctx.wagePerDayPaise * ctx.days;
  const computerCtx: ComputerCtx = { ...ctx, wageBillPaise };

  // Base: borrower pays the worker's wage bill.
  const lines: ChargeLine[] = [
    {
      moduleKey: "base",
      label: `Wage bill (${ctx.days} days @ ${ctx.wagePerDayPaise / 100}/day)`,
      fromParty: "DEMAND_HOTEL",
      toParty: "WORKER",
      amountPaise: wageBillPaise,
    },
  ];

  for (const m of modules) {
    if (!m.enabled) continue;
    const computer = MODULE_COMPUTERS[m.key];
    if (computer) lines.push(...computer(computerCtx, m.config ?? {}));
  }

  const totals: ChargeTotals = {
    wageBillPaise,
    borrowerPaysPaise: sumFrom(lines, "DEMAND_HOTEL") - sumTo(lines, "DEMAND_HOTEL"),
    workerGetsPaise: sumTo(lines, "WORKER") - sumFrom(lines, "WORKER"),
    homeHotelGetsPaise: sumTo(lines, "HOME_HOTEL") - sumFrom(lines, "HOME_HOTEL"),
    platformRevenuePaise: sumTo(lines, "PLATFORM") - sumFrom(lines, "PLATFORM"),
  };

  return { days: ctx.days, lines, totals };
}
