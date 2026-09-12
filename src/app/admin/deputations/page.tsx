import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Table, Th, Td, StateBadge, EmptyState } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/constants";

const ACTIVE = ["REQUESTED", "ACCEPTED", "AGREED", "IN_TRANSIT", "ACTIVE"];

export default async function AdminDeputations() {
  await requireRole("PLATFORM_ADMIN");
  const deps = await prisma.deputation.findMany({
    include: { worker: true, role: true, homeHotel: true, demandHotel: true },
    orderBy: { updatedAt: "desc" },
  });
  const active = deps.filter((d) => ACTIVE.includes(d.state)).length;

  return (
    <>
      <PageHeader title="Deputations" subtitle={`${deps.length} total · ${active} in progress`} />
      <Card>
        {deps.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No deputations yet" hint="They appear here as hotels request staff." />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Worker</Th>
                <Th>Role</Th>
                <Th>Route (home → host)</Th>
                <Th>Window</Th>
                <Th>Wage/day</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {deps.map((d) => (
                <tr key={d.id}>
                  <Td className="font-medium text-slate-800">{d.worker.name}</Td>
                  <Td>{d.role.name}</Td>
                  <Td className="text-xs">{d.homeHotel.name} → {d.demandHotel.name}</Td>
                  <Td className="whitespace-nowrap text-xs">{formatDate(d.startDate)} – {formatDate(d.endDate)}</Td>
                  <Td>{formatINR(d.wagePerDayPaise)}</Td>
                  <Td><StateBadge state={d.state} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
