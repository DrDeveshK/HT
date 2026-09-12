import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setRatingStatus } from "@/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, Table, Th, Td, Badge, Stars, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/constants";

export default async function AdminReviews() {
  await requireRole("PLATFORM_ADMIN");
  const ratings = await prisma.rating.findMany({
    orderBy: { createdAt: "desc" },
    include: { targetWorker: true, targetHotel: true },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="Moderate ratings. Hiding a review removes it from public reputation immediately."
      />
      <Card className="p-5">
        {ratings.length === 0 ? (
          <EmptyState title="No reviews yet" hint="Ratings appear here after deputations complete." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Target</Th>
                <Th>Rater</Th>
                <Th>Score</Th>
                <Th>Comment</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {ratings.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <span className="font-medium text-slate-800">
                      {r.targetWorker?.name ?? r.targetHotel?.name ?? "—"}
                    </span>
                    <span className="block text-xs text-slate-400">{r.targetWorkerId ? "worker" : "hotel"}</span>
                  </Td>
                  <Td>
                    {r.raterLabel}
                    {r.wouldRehire && <Badge tone="green">rehire</Badge>}
                  </Td>
                  <Td><Stars value={r.score} /></Td>
                  <Td className="max-w-[18rem] text-slate-500">{r.comment || "—"}</Td>
                  <Td>
                    <Badge tone={r.status === "VISIBLE" ? "green" : "red"}>{r.status}</Badge>
                    <span className="block text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                  </Td>
                  <Td className="text-right">
                    <form action={setRatingStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value={r.status === "VISIBLE" ? "HIDDEN" : "VISIBLE"} />
                      <SubmitButton size="sm" variant={r.status === "VISIBLE" ? "danger" : "secondary"} pendingText="…">
                        {r.status === "VISIBLE" ? "Hide" : "Restore"}
                      </SubmitButton>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
