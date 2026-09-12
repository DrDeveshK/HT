import { describe, it, expect } from "vitest";
import { computeCharges, REVENUE_MODULE_CATALOG, type RevenueModuleState } from "./index";

// ₹1000/day * 30 days = ₹30,000 wage bill (in paise: 100000 * 30 = 3,000,000)
const ctx = { wagePerDayPaise: 100000, days: 30, housingProvided: true };

function mods(
  overrides: Record<string, { enabled?: boolean; config?: Record<string, number> }> = {},
): RevenueModuleState[] {
  return REVENUE_MODULE_CATALOG.map((d) => ({
    key: d.key,
    enabled: overrides[d.key]?.enabled ?? d.defaultEnabled,
    config: overrides[d.key]?.config ?? d.defaultConfig,
  }));
}

describe("fee engine (modular monetization)", () => {
  it("worker always receives the full wage bill", () => {
    const r = computeCharges(mods(), ctx);
    expect(r.totals.wageBillPaise).toBe(3000000);
    expect(r.totals.workerGetsPaise).toBe(3000000);
  });

  it("default 15% commission is platform revenue on top of the wage", () => {
    const r = computeCharges(mods(), ctx);
    expect(r.totals.platformRevenuePaise).toBe(450000); // 15% of 30,000
    expect(r.totals.borrowerPaysPaise).toBe(3450000); // wage + commission
  });

  it("disabling commission drops platform revenue to zero", () => {
    const r = computeCharges(mods({ deputation_commission: { enabled: false } }), ctx);
    expect(r.totals.platformRevenuePaise).toBe(0);
    expect(r.totals.borrowerPaysPaise).toBe(3000000);
  });

  it("enabling more modules stacks platform revenue", () => {
    const r = computeCharges(
      mods({
        verification: { enabled: true, config: { flatPaise: 50000 } },
        managed_payroll: { enabled: true, config: { marginPercent: 8 } },
      }),
      ctx,
    );
    // commission 450000 + verification 50000 + payroll 8% (240000) = 740000
    expect(r.totals.platformRevenuePaise).toBe(740000);
  });

  it("routes a lending fee to the home hotel", () => {
    const r = computeCharges(
      mods({
        deputation_commission: {
          enabled: true,
          config: { percent: 15, flatPaise: 0, homeHotelSharePercent: 10 },
        },
      }),
      ctx,
    );
    expect(r.totals.homeHotelGetsPaise).toBe(300000); // 10% of 30,000
  });
});
