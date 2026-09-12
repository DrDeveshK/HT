"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

function safeConfig(json: string): Record<string, number> {
  try {
    return JSON.parse(json) as Record<string, number>;
  } catch {
    return {};
  }
}

export async function setModule(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const key = String(formData.get("key"));
  const mod = await prisma.revenueModule.findUnique({ where: { key } });
  if (!mod) throw new Error("Module not found.");

  const enabled = formData.get("enabled") === "on";
  const existing = safeConfig(mod.configJson);
  const config: Record<string, number> = {};
  for (const k of Object.keys(existing)) {
    const v = formData.get(`cfg_${k}`);
    config[k] = v != null && v !== "" ? Number(v) : existing[k];
  }

  await prisma.revenueModule.update({
    where: { key },
    data: { enabled, configJson: JSON.stringify(config) },
  });
  revalidatePath("/admin/revenue");
  revalidatePath("/admin");
}
