import { prisma } from "@/lib/db";
import { aggregateWorker, aggregateHotel } from "@/core/reputation";

/** Recompute + persist a worker's portable reputation from all their ratings. */
export async function recomputeWorkerReputation(workerId: string): Promise<void> {
  const ratings = await prisma.rating.findMany({ where: { targetWorkerId: workerId } });
  const agg = aggregateWorker(ratings);
  const deputationsCount = await prisma.deputation.count({
    where: { workerId, state: { in: ["COMPLETED", "RETURNED"] } },
  });
  await prisma.worker.update({
    where: { id: workerId },
    data: {
      reputationScore: agg.overall,
      ratingCount: agg.count,
      dimensionAggJson: JSON.stringify(agg.dims),
      rehireRate: agg.rehireRate,
      deputationsCount,
    },
  });
}

/** Recompute + persist a hotel's reverse-reputation from worker reviews. */
export async function recomputeHotelReputation(hotelId: string): Promise<void> {
  const ratings = await prisma.rating.findMany({ where: { targetHotelId: hotelId } });
  const agg = aggregateHotel(ratings);
  await prisma.hotel.update({
    where: { id: hotelId },
    data: { ratingAggJson: JSON.stringify(agg.dims), ratingCount: agg.count },
  });
}
