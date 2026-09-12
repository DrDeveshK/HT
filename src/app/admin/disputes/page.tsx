import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveDispute } from "@/actions/disputes";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, Badge, Input, Select, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/constants";

export default async function AdminDisputes() {
  await requireRole("PLATFORM_ADMIN");
  const disputes = await prisma.dispute.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      raisedBy: true,
      deputation: { include: { worker: true, homeHotel: true, demandHotel: true } },
    },
  });
  const open = disputes.filter((d) => d.status === "OPEN").length;

  return (
    <>
      <PageHeader title="Disputes" subtitle={`Resolve grievances raised on deputations. ${open} open.`} />
      {disputes.length === 0 ? (
        <EmptyState title="No disputes" hint="Parties can raise a dispute from a deputation." />
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={d.category === "SAFETY" ? "red" : "amber"}>{d.category}</Badge>
                <Badge tone={d.status === "OPEN" ? "amber" : d.status === "RESOLVED" ? "green" : "slate"}>{d.status}</Badge>
                <span className="text-sm text-slate-500">
                  {d.deputation.worker.name}: {d.deputation.homeHotel.name} → {d.deputation.demandHotel.name}
                </span>
                <span className="ml-auto text-xs text-slate-400">{d.raisedBy.name} · {formatDate(d.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{d.description}</p>
              {d.status === "OPEN" ? (
                <form action={resolveDispute} className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
                  <input type="hidden" name="id" value={d.id} />
                  <Select name="status" defaultValue="RESOLVED" className="w-36">
                    <option value="RESOLVED">Resolve</option>
                    <option value="REJECTED">Reject</option>
                  </Select>
                  <Input name="resolutionNote" placeholder="Resolution note" className="min-w-[14rem] flex-1" />
                  <SubmitButton size="sm" pendingText="Saving…">Submit</SubmitButton>
                </form>
              ) : (
                d.resolutionNote && <p className="mt-2 border-t border-slate-100 pt-2 text-sm text-slate-500">Resolution: {d.resolutionNote}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
