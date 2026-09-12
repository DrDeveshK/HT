"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function toggleHotelAmenity(formData: FormData) {
  const user = await requireRole("HOTELIER_ADMIN");
  if (!user.hotelId) return;
  const amenityId = String(formData.get("amenityId"));
  const existing = await prisma.hotelAmenity.findUnique({
    where: { hotelId_amenityId: { hotelId: user.hotelId, amenityId } },
  });
  if (existing) await prisma.hotelAmenity.delete({ where: { id: existing.id } });
  else await prisma.hotelAmenity.create({ data: { hotelId: user.hotelId, amenityId } });
  revalidatePath("/hotel/profile");
}

export async function toggleFavourite(formData: FormData) {
  const user = await requireRole("HOTELIER_ADMIN");
  if (!user.hotelId) return;
  const workerId = String(formData.get("workerId"));
  const existing = await prisma.favourite.findUnique({
    where: { hotelId_workerId: { hotelId: user.hotelId, workerId } },
  });
  if (existing) await prisma.favourite.delete({ where: { id: existing.id } });
  else await prisma.favourite.create({ data: { hotelId: user.hotelId, workerId } });
  revalidatePath("/hotel/marketplace");
  revalidatePath(`/workers/${workerId}`);
}

export async function updateHotelProfile(formData: FormData) {
  const user = await requireRole("HOTELIER_ADMIN");
  if (!user.hotelId) return;
  const csv = (k: string) =>
    String(formData.get(k) || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  await prisma.hotel.update({
    where: { id: user.hotelId },
    data: {
      cuisinesJson: JSON.stringify(csv("cuisines")),
      languagesJson: JSON.stringify(csv("languages")),
      brandStandards: String(formData.get("brandStandards") || "") || null,
      staffHousingCapacity: Math.max(0, Number(formData.get("staffHousingCapacity") || 0)),
    },
  });
  revalidatePath("/hotel/profile");
}
