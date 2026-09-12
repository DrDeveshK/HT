import { prisma } from "@/lib/db";
import {
  computeCharges,
  type RevenueModuleState,
  type ChargeContext,
  type ChargeResult,
} from "@/core/monetization";

function safeConfig(json: string): Record<string, number> {
  try {
    return JSON.parse(json) as Record<string, number>;
  } catch {
    return {};
  }
}

export async function getEnabledModules(): Promise<RevenueModuleState[]> {
  const rows = await prisma.revenueModule.findMany();
  return rows.map((r) => ({ key: r.key, enabled: r.enabled, config: safeConfig(r.configJson) }));
}

export function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
}

/** Compute the money split for a deputation using the currently-enabled modules. */
export async function computeDeputationCharges(ctx: ChargeContext): Promise<ChargeResult> {
  const modules = await getEnabledModules();
  return computeCharges(modules, ctx);
}

const LEDGER_TYPE: Record<string, string> = {
  base: "PAYOUT_WORKER",
};

/** Persist ledger lines for a deputation (replaces any prior lines). */
export async function writeDeputationLedger(deputationId: string): Promise<ChargeResult | null> {
  const dep = await prisma.deputation.findUnique({ where: { id: deputationId } });
  if (!dep) return null;

  const days = daysBetween(dep.startDate, dep.endDate);
  const result = await computeDeputationCharges({
    wagePerDayPaise: dep.wagePerDayPaise,
    days,
    housingProvided: dep.housingProvided,
  });

  await prisma.ledgerEntry.deleteMany({ where: { deputationId } });
  for (const line of result.lines) {
    const type =
      LEDGER_TYPE[line.moduleKey] ??
      (line.toParty === "PLATFORM"
        ? "PLATFORM_FEE"
        : line.toParty === "HOME_HOTEL"
          ? "PAYOUT_HOME_HOTEL"
          : "CHARGE");
    await prisma.ledgerEntry.create({
      data: {
        deputationId,
        type,
        moduleKey: line.moduleKey,
        amountPaise: line.amountPaise,
        direction: line.toParty === "PLATFORM" ? "REVENUE" : "CREDIT",
        payeeType: line.toParty,
        description: `${line.label} (${line.fromParty} → ${line.toParty})`,
      },
    });
  }
  return result;
}
