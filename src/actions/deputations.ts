"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { canTransition, actionsFor, type Actor } from "@/core/deputation/stateMachine";
import { writeDeputationLedger } from "@/lib/fees";
import { recomputeWorkerReputation, recomputeHotelReputation } from "@/lib/reputation";
import { WORKER_RATING_DIMENSIONS, HOTEL_RATING_DIMENSIONS } from "@/lib/constants";
import type { DeputationState, RaterRole } from "@/lib/constants";

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

  const housingProvided = decl?.housingProvided ?? true;
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
      housingProvided,
      state: "NEGOTIATING",
    },
  });
  // Opening offer kicks off the negotiation (M4).
  await prisma.offer.create({
    data: {
      deputationId: dep.id,
      byParty: "DEMAND_HOTEL",
      wagePerDayPaise,
      startDate: start,
      endDate: end,
      housingProvided,
      status: "PROPOSED",
      note: "Opening offer",
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
  const comment = String(formData.get("comment") || "") || null;
  const targetType = String(formData.get("targetType")); // WORKER | HOTEL
  const wouldRehire = formData.get("wouldRehire") === "on";

  const dep = await prisma.deputation.findUnique({ where: { id } });
  if (!dep) throw new Error("Deputation not found.");
  const actor = actorFor(user, dep);
  if (!actor) throw new Error("Not authorized.");

  // Collect the per-dimension 1-5 scores; overall = rounded mean.
  const dims = targetType === "WORKER" ? WORKER_RATING_DIMENSIONS : HOTEL_RATING_DIMENSIONS;
  const scores: Record<string, number> = {};
  for (const d of dims) {
    const v = Math.round(Number(formData.get(`dim_${d.key}`)));
    if (v >= 1 && v <= 5) scores[d.key] = v;
  }
  const vals = Object.values(scores);
  const overall = vals.length ? Math.round(vals.reduce((s, n) => s + n, 0) / vals.length) : 5;
  const scoresJson = JSON.stringify(scores);

  const raterRole: RaterRole =
    actor === "WORKER" ? "WORKER" : actor === "HOME_HOTEL" ? "HOME_HOTEL" : "HOST_HOTEL";

  if (targetType === "WORKER") {
    if (actor !== "DEMAND_HOTEL") throw new Error("Only the host hotel rates the worker.");
    await prisma.rating.create({
      data: {
        deputationId: id, targetWorkerId: dep.workerId, raterLabel: "Host Hotel",
        raterRole, score: overall, scoresJson, wouldRehire, comment,
      },
    });
    await recomputeWorkerReputation(dep.workerId);
    revalidatePath(`/workers/${dep.workerId}`);
  } else {
    // Which hotel is being rated: worker picks; hotels rate their counterpart.
    let targetHotelId: string;
    if (actor === "WORKER") {
      const picked = String(formData.get("targetHotelId") || dep.demandHotelId);
      targetHotelId = picked === dep.homeHotelId ? dep.homeHotelId : dep.demandHotelId;
    } else {
      targetHotelId = actor === "DEMAND_HOTEL" ? dep.homeHotelId : dep.demandHotelId;
    }
    const raterLabel = actor === "WORKER" ? "Worker" : actor === "DEMAND_HOTEL" ? "Host Hotel" : "Home Hotel";
    await prisma.rating.create({
      data: { deputationId: id, targetHotelId, raterLabel, raterRole, score: overall, scoresJson, comment },
    });
    await recomputeHotelReputation(targetHotelId);
    revalidatePath(`/hotels/${targetHotelId}`);
  }

  revalidatePath(`/hotel/deputations/${id}`);
  revalidatePath("/hotel/marketplace");
  revalidatePath("/worker");
}

// ---------------- M4: wage/terms negotiation ----------------
export async function makeCounterOffer(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const dep = await prisma.deputation.findUnique({ where: { id } });
  if (!dep) throw new Error("Deputation not found.");
  const actor = actorFor(user, dep);
  if (!actor || actor === "PLATFORM") throw new Error("Not authorized to negotiate.");
  if (dep.state !== "NEGOTIATING" && dep.state !== "REQUESTED") throw new Error("Negotiation is closed.");

  const wagePerDayPaise = Math.round(Number(formData.get("wageRupees") || 0) * 100);
  if (wagePerDayPaise <= 0) throw new Error("Enter a wage.");
  const startDate = formData.get("startDate") ? new Date(String(formData.get("startDate"))) : dep.startDate;
  const endDate = formData.get("endDate") ? new Date(String(formData.get("endDate"))) : dep.endDate;
  const housingProvided = formData.get("housingProvided") === "on";
  const note = String(formData.get("note") || "") || null;

  // Supersede any still-open offer, then post the counter.
  await prisma.offer.updateMany({
    where: { deputationId: id, status: { in: ["PROPOSED", "COUNTERED"] } },
    data: { status: "COUNTERED" },
  });
  await prisma.offer.create({
    data: { deputationId: id, byParty: actor, wagePerDayPaise, startDate, endDate, housingProvided, note, status: "PROPOSED" },
  });
  if (dep.state === "REQUESTED") await prisma.deputation.update({ where: { id }, data: { state: "NEGOTIATING" } });

  revalidatePath(`/hotel/deputations/${id}`);
}

export async function acceptOffer(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const offerId = String(formData.get("offerId"));
  const dep = await prisma.deputation.findUnique({ where: { id } });
  if (!dep) throw new Error("Deputation not found.");
  const actor = actorFor(user, dep);
  if (!actor || actor === "PLATFORM") throw new Error("Not authorized.");
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.deputationId !== id) throw new Error("Offer not found.");
  if (offer.status !== "PROPOSED" && offer.status !== "COUNTERED") throw new Error("Offer no longer open.");
  if (offer.byParty === actor) throw new Error("You cannot accept your own offer — wait for the other party.");

  await prisma.offer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } });
  await prisma.offer.updateMany({
    where: { deputationId: id, status: { in: ["PROPOSED", "COUNTERED"] }, id: { not: offerId } },
    data: { status: "REJECTED" },
  });
  // Lock the agreed terms onto the deputation and advance.
  await prisma.deputation.update({
    where: { id },
    data: {
      wagePerDayPaise: offer.wagePerDayPaise,
      startDate: offer.startDate,
      endDate: offer.endDate,
      housingProvided: offer.housingProvided,
      state: "ACCEPTED",
    },
  });

  revalidatePath(`/hotel/deputations/${id}`);
  revalidatePath("/hotel/deputations");
  revalidatePath("/worker");
}

export async function rejectOffer(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const offerId = String(formData.get("offerId"));
  const dep = await prisma.deputation.findUnique({ where: { id } });
  if (!dep) throw new Error("Deputation not found.");
  const actor = actorFor(user, dep);
  if (!actor || actor === "PLATFORM") throw new Error("Not authorized.");
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.deputationId !== id) throw new Error("Offer not found.");
  if (offer.byParty === actor) throw new Error("Use withdraw for your own offer.");
  await prisma.offer.update({ where: { id: offerId }, data: { status: "REJECTED" } });
  revalidatePath(`/hotel/deputations/${id}`);
}

export async function withdrawOffer(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const offerId = String(formData.get("offerId"));
  const dep = await prisma.deputation.findUnique({ where: { id } });
  if (!dep) throw new Error("Deputation not found.");
  const actor = actorFor(user, dep);
  if (!actor) throw new Error("Not authorized.");
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.deputationId !== id) throw new Error("Offer not found.");
  if (offer.byParty !== actor) throw new Error("You can only withdraw your own offer.");
  await prisma.offer.update({ where: { id: offerId }, data: { status: "WITHDRAWN" } });
  revalidatePath(`/hotel/deputations/${id}`);
}
