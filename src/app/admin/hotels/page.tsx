import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadSeasonContext } from "@/lib/seasonal-data";
import { PageHeader, Card, Table, Th, Td, SeasonPill, Badge } from "@/components/ui";

export default async function AdminHotels() {
  await requireRole("PLATFORM_ADMIN");
  const { stateOf } = await loadSeasonContext();
  const hotels = await prisma.hotel.findMany({
    include: { region: true, subscription: true, _count: { select: { homeWorkers: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader title="Hotels" subtitle={`${hotels.length} hotels onboarded`} />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Hotel</Th>
              <Th>Region</Th>
              <Th>Season</Th>
              <Th>Rooms</Th>
              <Th>Tier</Th>
              <Th>Plan</Th>
              <Th>Workers</Th>
            </tr>
          </thead>
          <tbody>
            {hotels.map((h) => (
              <tr key={h.id}>
                <Td>
                  <span className="font-medium text-slate-800">{h.name}</span>
                  <span className="block text-xs text-slate-400">{h.city}</span>
                </Td>
                <Td className="text-xs">{h.region.name}</Td>
                <Td><SeasonPill state={stateOf(h.regionId)} /></Td>
                <Td>{h.rooms}</Td>
                <Td>{h.tier}</Td>
                <Td><Badge tone="blue">{h.subscription?.plan ?? "—"}</Badge></Td>
                <Td>{h._count.homeWorkers}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
