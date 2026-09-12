"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ARCHETYPES } from "@/lib/archetypes";
import { recomputeWorkerReputation, recomputeHotelReputation } from "@/lib/reputation";

const slug = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "");

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

export async function setKyc(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const workerId = String(formData.get("workerId"));
  const status = String(formData.get("status"));
  if (!["VERIFIED", "REJECTED", "PENDING"].includes(status)) return;
  await prisma.worker.update({ where: { id: workerId }, data: { kycStatus: status } });
  revalidatePath("/admin/workers");
}

// ---------------- M1: taxonomy & config CRUD ----------------

export async function addRole(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "OTHER");
  if (!name) return;
  await prisma.role.upsert({ where: { name }, create: { name, category }, update: { category, active: true } });
  revalidatePath("/admin/taxonomy");
}

export async function setRoleActive(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await prisma.role.update({ where: { id }, data: { active } });
  revalidatePath("/admin/taxonomy");
}

export async function addSkill(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "OTHER");
  if (!name) return;
  await prisma.skill.upsert({ where: { name }, create: { name, category }, update: { category, active: true } });
  revalidatePath("/admin/taxonomy");
}

export async function setSkillActive(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await prisma.skill.update({ where: { id }, data: { active } });
  revalidatePath("/admin/taxonomy");
}

export async function addAmenity(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.amenity.upsert({ where: { name }, create: { name }, update: { active: true } });
  revalidatePath("/admin/settings");
}

export async function setAmenityActive(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await prisma.amenity.update({ where: { id }, data: { active } });
  revalidatePath("/admin/settings");
}

export async function updatePlan(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const id = String(formData.get("id"));
  const priceRupees = Number(formData.get("priceRupees") || 0);
  const blurb = String(formData.get("blurb") || "");
  const active = formData.get("active") === "on";
  await prisma.plan.update({
    where: { id },
    data: { pricePaise: Math.round(priceRupees * 100), blurb, active },
  });
  revalidatePath("/admin/plans");
  revalidatePath("/hotel/subscription");
}

export async function addHotspot(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const name = String(formData.get("name") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const zone = String(formData.get("zone") || "OTHER");
  const arch = ARCHETYPES[String(formData.get("arch"))];
  if (!name || !state || !arch) return;
  const code = `${slug(name)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const region = await prisma.region.create({
    data: { code, name, state, zone, dominantType: arch.dominantType },
  });
  await prisma.seasonalPack.createMany({
    data: arch.months.map((s, i) => ({ regionId: region.id, month: i + 1, state: s })),
  });
  revalidatePath("/admin/seasons");
}

export async function setSetting(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const key = String(formData.get("key") || "").trim();
  const value = String(formData.get("value") || "");
  if (!key) return;
  await prisma.platformSetting.upsert({ where: { key }, create: { key, valueJson: value }, update: { valueJson: value } });
  revalidatePath("/admin/settings");
}

// ---------------- M3: review moderation ----------------
export async function setRatingStatus(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["VISIBLE", "HIDDEN"].includes(status)) return;
  const rating = await prisma.rating.update({ where: { id }, data: { status } });
  // Hidden ratings must drop out of the aggregate immediately.
  if (rating.targetWorkerId) await recomputeWorkerReputation(rating.targetWorkerId);
  if (rating.targetHotelId) await recomputeHotelReputation(rating.targetHotelId);
  revalidatePath("/admin/reviews");
}
