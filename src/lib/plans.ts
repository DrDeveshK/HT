import { prisma } from "@/lib/db";

export async function getActivePlans() {
  return prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
}

export async function getAllPlans() {
  return prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getPlanMap(): Promise<Record<string, { key: string; name: string; pricePaise: number }>> {
  const plans = await prisma.plan.findMany();
  return Object.fromEntries(plans.map((p) => [p.key, p]));
}

export function planFeatures(featuresJson: string): string[] {
  try {
    return JSON.parse(featuresJson) as string[];
  } catch {
    return [];
  }
}
