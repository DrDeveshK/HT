import { prisma } from "@/lib/db";
import { DEFAULT_ASSUMPTIONS, type SavingsAssumptions } from "@/core/analytics";

/** Load admin-tunable savings assumptions from PlatformSetting (key "savings"). */
export async function loadSavingsAssumptions(): Promise<SavingsAssumptions> {
  const row = await prisma.platformSetting.findUnique({ where: { key: "savings" } });
  if (!row) return DEFAULT_ASSUMPTIONS;
  try {
    return { ...DEFAULT_ASSUMPTIONS, ...(JSON.parse(row.valueJson) as Partial<SavingsAssumptions>) };
  } catch {
    return DEFAULT_ASSUMPTIONS;
  }
}
