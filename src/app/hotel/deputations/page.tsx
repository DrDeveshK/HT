import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Table, Th, Td, StateBadge, Badge, EmptyState } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/constants";

export default async function DeputationsList() {
  const user = await requireRole("HOTELIER_ADMIN");
  const hotel = user.hotel!;
  const deps = await prisma.deputation.findMany({
    where: { OR: [{ homeHotelId: hotel.id }, { demandHotelId: hotel.id }] },
    include: { worker: true, role: true, homeHotel: true, demandHotel: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Deputations" subtitle="Staff you've lent out and staff you've borrowed." />
      <Card>
        {deps.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No deputations yet" hint="Request staff from the marketplace to get started." />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Worker</Th>
                <Th>Role</Th>
                <Th>Direction</Th>
                <Th>Counterparty</Th>
                <Th>Window</Th>
                <Th>Wage/day</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {deps.map((d) => {
                const lending = d.homeHotelId === hotel.id;
                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/hotel/deputations/${d.id}`} className="font-medium text-brand-600 hover:underline">
                        {d.worker.name}
                      </Link>
                    </Td>
                    <Td>{d.role.name}</Td>
                    <Td><Badge tone={lending ? "blue" : "teal"}>{lending ? "Lending out" : "Borrowing"}</Badge></Td>
                    <Td>{lending ? d.demandHotel.name : d.homeHotel.name}</Td>
                    <Td className="whitespace-nowrap text-xs">{formatDate(d.startDate)} – {formatDate(d.endDate)}</Td>
                    <Td>{formatINR(d.wagePerDayPaise)}</Td>
                    <Td><StateBadge state={d.state} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
