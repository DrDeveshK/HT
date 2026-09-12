import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleFavourite } from "@/actions/hotel";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, CardHeader, Stat, Stars, RatingBar, RehirePill, Badge, EmptyState } from "@/components/ui";
import { WORKER_RATING_DIMENSIONS, formatDate } from "@/lib/constants";

function parseJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export default async function WorkerProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const worker = await prisma.worker.findUnique({
    where: { id },
    include: {
      primaryRole: true,
      homeHotel: { include: { region: true } },
      skills: { include: { skill: true } },
      ratings: {
        where: { status: "VISIBLE", targetWorkerId: id },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!worker) notFound();

  const dims = parseJson<Record<string, number>>(worker.dimensionAggJson, {});
  const canFavourite = user.role === "HOTELIER_ADMIN" && !!user.hotelId;
  const isFav = canFavourite
    ? !!(await prisma.favourite.findUnique({
        where: { hotelId_workerId: { hotelId: user.hotelId!, workerId: id } },
      }))
    : false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title={worker.name}
        subtitle={`${worker.primaryRole.name} · home: ${worker.homeHotel.name}, ${worker.homeHotel.city}`}
        action={
          canFavourite ? (
            <form action={toggleFavourite}>
              <input type="hidden" name="workerId" value={worker.id} />
              <SubmitButton variant={isFav ? "primary" : "secondary"} size="sm" pendingText="Saving…">
                {isFav ? "♥ Favourited" : "♡ Favourite"}
              </SubmitButton>
            </form>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Reputation" value={<Stars value={worker.reputationScore} />} sub={`${worker.ratingCount} reviews`} />
        <Stat label="Rehire rate" value={<RehirePill rate={worker.rehireRate} />} />
        <Stat label="Deputations" value={worker.deputationsCount} sub="completed" />
        <Stat label="Experience" value={`${worker.experienceYears}y`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Performance breakdown" subtitle="How host hotels rated this worker" />
          <div className="space-y-3 p-5">
            {worker.ratingCount === 0 ? (
              <EmptyState title="No ratings yet" hint="Reputation appears after the first completed deputation." />
            ) : (
              WORKER_RATING_DIMENSIONS.map((d) => <RatingBar key={d.key} label={d.label} value={dims[d.key] ?? 0} />)
            )}
            {worker.skills.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="mb-1.5 text-xs text-slate-400">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {worker.skills.map((ws) => (
                    <Badge key={ws.id} tone="slate">
                      {ws.skill.name} {"★".repeat(ws.proficiency)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Review history" subtitle={`${worker.ratings.length} reviews`} />
          <div className="p-5">
            {worker.ratings.length === 0 ? (
              <EmptyState title="No reviews yet" />
            ) : (
              <ul className="space-y-3">
                {worker.ratings.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={r.score} />
                      <span className="text-xs text-slate-500">{r.raterLabel}</span>
                      {r.wouldRehire && <Badge tone="green">would rehire</Badge>}
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
