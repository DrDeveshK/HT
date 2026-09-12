import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { overallFromDims } from "@/core/reputation";
import { PageHeader, Card, CardHeader, Stat, Stars, RatingBar, EmptyState, Badge } from "@/components/ui";
import { HOTEL_RATING_DIMENSIONS, formatDate } from "@/lib/constants";

function parseJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export default async function HotelProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();

  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: {
      region: true,
      ratings: {
        where: { status: "VISIBLE", targetHotelId: id, raterRole: "WORKER" },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!hotel) notFound();

  const dims = parseJson<Record<string, number>>(hotel.ratingAggJson, {});
  const overall = overallFromDims(dims);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title={hotel.name}
        subtitle={`${hotel.city} · ${hotel.region.state} · ${hotel.tier.toLowerCase()} property`}
        action={<Badge tone="slate">{hotel.rooms} rooms</Badge>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Employer rating" value={<Stars value={overall} />} sub="from deputed staff" />
        <Stat label="Reviews" value={hotel.ratingCount} sub="by workers" />
        <Stat label="Staff housing" value={hotel.staffHousingCapacity > 0 ? `${hotel.staffHousingCapacity} beds` : "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="How they treat staff" subtitle="Averaged from worker reviews" />
          <div className="space-y-3 p-5">
            {hotel.ratingCount === 0 ? (
              <EmptyState title="No worker reviews yet" hint="Staff rate a hotel after a completed deputation." />
            ) : (
              HOTEL_RATING_DIMENSIONS.map((d) => <RatingBar key={d.key} label={d.label} value={dims[d.key] ?? 0} />)
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="What staff say" subtitle={`${hotel.ratings.length} reviews`} />
          <div className="p-5">
            {hotel.ratings.length === 0 ? (
              <EmptyState title="No reviews yet" />
            ) : (
              <ul className="space-y-3">
                {hotel.ratings.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={r.score} />
                      <span className="text-xs text-slate-500">deputed staff</span>
                      <span className="ml-auto text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                    </div>
                    {r.comment && <p className="mt-1.5 text-sm text-slate-600">“{r.comment}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
