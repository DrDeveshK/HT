"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { canTransition, actionsFor, type Actor } from "@/core/deputation/stateMachine";
import { writeDeputationLedger } from "@/lib/fees";
import type { DeputationState } from "@/lib/constants";

type DepLike = { homeHotelId: string; demandHotelId: string; workerId: string };

function actorFor(user: CurrentUser, dep: DepLike): Actor | null {
  if (user.role === "PLATFORM_ADMIN") return "PLATFORM";
  if (user.role === "HOTELIER_ADMIN" && user.hotelId === dep.homeHotelId) return "HOME_HOTEL";
  if (user.role === "HOTELIER_ADMIN" && user.hotelId === dep.demandHotelId) return "DEMAND_HOTEL";
  if (user.role === "WORKER" && user.workerId === dep.workerId) return "WORKER";
  return null;
}

export async function requestDeputation(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "HOTELIER_ADMIN" || !user.hotelId) throw new Error("Only hoteliers can request staff.");

  const workerId = String(formData.get("workerId"));
  const declarationId = formData.get("declarationId") ? String(formData.get("declarationId")) : null;
  const wageRupees = Number(formData.get("wageRupees") || 0);

  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker) throw new Error("Worker not found.");
  if (worker.homeHotelId === user.hotelId) throw new Error("You cannot borrow your own staff.");

  const decl = declarationId
    ? await prisma.seasonDeclaration.findUnique({ where: { id: declarationId } })
    : null;
  const start = decl?.startDate ?? new Date(Date.now() + 7 * 86400000);
  const end = decl?.endDate ?? new Date(Date.now() + 97 * 86400000);
  const wagePerDayPaise =
    wageRupees > 0 ? Math.round(wageRupees * 100) : decl?.wageOfferPaise || worker.expectedWagePaise;

  const dep = await prisma.deputation.create({
    data: {
      declarationId: declarationId ?? undefined,
      workerId,
      homeHotelId: worker.homeHotelId,
      demandHotelId: user.hotelId,
      roleId: worker.primaryRoleId,
      startDate: start,
      endDate: end,
      wagePerDayPaise,
      housingProvided: decl?.housingProvided ?? true,
      state: "REQUESTED",
    },
  });

  revalidatePath("/hotel/deputations");
  redirect(`/hotel/deputations/${dep.id}`);
}

export async function transitionDeputation(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const to = String(formData.get("to")) as DeputationState;

  const dep = await prisma.deputation.findUnique({ where: { id } });
  if (!dep) throw new Error("Deputation not found.");

  const actor = actorFor(user, dep);
  if (!actor) throw new Error("Not authorized for this deputation.");

  const from = dep.state as DeputationState;
  const allowed = actionsFor(from, actor).some((a) => a.to === to) && canTransition(from, to);
  if (!allowed) throw new Error(`Cannot move ${from} → ${to}.`);

  await prisma.deputation.update({ where: { id }, data: { state: to } });

  if (to === "AGREED") {
    await prisma.agreement.upsert({
      where: { deputationId: id },
      create: {
        deputationId: id,
        eSignStatus: "SIGNED",
        homeSignedAt: new Date(),
        demandSignedAt: new Date(),
        workerConsentAt: new Date(),
        termsJson: JSON.stringify({ wagePerDayPaise: dep.wagePerDayPaise }),
      },
      update: { eSignStatus: "SIGNED", homeSignedAt: new Date(), demandSignedAt: new Date() },
    });
    await prisma.worker.update({ where: { id: dep.workerId }, data: { availabilityStatus: "ON_DEPUTATION" } });
    await writeDeputationLedger(id);
  }

  if (to === "RETURNED" || to === "CANCELLED") {
    await prisma.worker.update({ where: { id: dep.workerId }, data: { availabilityStatus: "AVAILABLE" } });
  }

  revalidatePath(`/hotel/deputations/${id}`);
  revalidatePath("/hotel/deputations");
  revalidatePath("/worker");
}

export async function submitRating(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const score = Math.max(1, Math.min(5, Number(formData.get("score") || 5)));
  const comment = String(formData.get("comment") || "") || null;
  const targetType = String(formData.get("targetType"));

  const dep = await prisma.deputation.findUnique({ where: { id } });
  if (!dep) throw new Error("Deputation not found.");
  const actor = actorFor(user, dep);
  if (!actor) throw new Error("Not authorized.");

  if (targetType === "WORKER") {
    await prisma.rating.create({
      data: { deputationId: id, targetWorkerId: dep.workerId, raterLabel: "Demand Hotel", score, comment },
    });
    const ratings = await prisma.rating.findMany({ where: { targetWorkerId: dep.workerId } });
    const avg = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
    await prisma.worker.update({
      where: { id: dep.workerId },
      data: { reputationScore: avg, ratingCount: ratings.length },
    });
  } else {
    const targetHotelId = actor === "DEMAND_HOTEL" ? dep.homeHotelId : dep.demandHotelId;
    await prisma.rating.create({
      data: { deputationId: id, targetHotelId, raterLabel: actor, score, comment },
    });
  }

  revalidatePath(`/hotel/deputations/${id}`);
}
