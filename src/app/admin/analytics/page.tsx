import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { daysBetween } from "@/lib/fees";
import { openDeclarationCountsByRegion } from "@/lib/seasonal-data";
import { PageHeader, Card, CardHeader, Stat, Table, Th, Td } from "@/components/ui";
import { formatINR } from "@/lib/constants";

const VALUE_STATES = ["AGREED", "IN_TRANSIT", "ACTIVE", "COMPLETED", "RETURNED"];

export default async function AdminAnalytics() {
  await requireRole("PLATFORM_ADMIN");
  const [deps, ledger, decls, ratings, counts] = await Promise.all([
    prisma.deputation.findMany(),
    prisma.ledgerEntry.findMany(),
    prisma.seasonDeclaration.findMany(),
    prisma.rating.findMany({ where: { status: "VISIBLE" } }),
    openDeclarationCountsByRegion(),
  ]);

  const valueDeps = deps.filter((d) => VALUE_STATES.includes(d.state));
  const gmv = valueDeps.reduce((s, d) => s + d.wagePerDayPaise * daysBetween(d.startDate, d.endDate), 0);
  const platformRev = ledger.filter((l) => l.direction === "REVENUE").reduce((s, l) => s + l.amountPaise, 0);
  const takeRate = gmv > 0 ? (platformRev / gmv) * 100 : 0;
  const fulfilled = decls.filter((d) => d.status === "FULFILLED").length;
  const fillRate = decls.length > 0 ? (fulfilled / decls.length) * 100 : 0;
  const surplus = Object.values(counts).reduce((s, c) => s + c.surplus, 0);
  const demand = Object.values(counts).reduce((s, c) => s + c.demand, 0);
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : 0;

  const byState: Record<string, number> = {};
  for (const d of deps) byState[d.state] = (byState[d.state] ?? 0) + 1;

  return (
    <>
      <PageHeader title="Marketplace analytics" subtitle="Liquidity, GMV, take-rate, fill-rate and satisfaction." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="GMV (wage bill)" value={formatINR(gmv)} sub={`${valueDeps.length} live deputations`} />
        <Stat label="Platform revenue" value={formatINR(platformRev)} sub={`${takeRate.toFixed(1)}% take-rate`} />
        <Stat label="Fill rate" value={`${fillRate.toFixed(0)}%`} sub={`${fulfilled}/${decls.length} declarations filled`} />
        <Stat label="Avg rating" value={`★ ${avgRating.toFixed(1)}`} sub={`${ratings.length} reviews`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Liquidity" subtitle="Open supply vs demand across India" />
          <div className="grid grid-cols-2 gap-3 p-5">
            <Stat label="Staff offered (surplus)" value={surplus} />
            <Stat label="Staff needed (demand)" value={demand} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Deputations by state" />
          <div className="p-5">
            <Table>
              <thead>
                <tr>
                  <Th>State</Th>
                  <Th className="text-right">Count</Th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byState).map(([s, n]) => (
                  <tr key={s}>
                    <Td>{s.replace("_", " ")}</Td>
                    <Td className="text-right">{n}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      </div>
    </>
  );
}
