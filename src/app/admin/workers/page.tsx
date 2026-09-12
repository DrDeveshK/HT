import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setKyc } from "@/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, Table, Th, Td, Badge } from "@/components/ui";
import { formatINR } from "@/lib/constants";

export default async function AdminWorkers() {
  await requireRole("PLATFORM_ADMIN");
  const workers = await prisma.worker.findMany({
    include: { homeHotel: { include: { region: true } }, primaryRole: true },
    orderBy: { name: "asc" },
  });

  const pending = workers.filter((w) => w.kycStatus !== "VERIFIED").length;

  return (
    <>
      <PageHeader
        title="Workers"
        subtitle={`${workers.length} in the talent pool · ${pending} awaiting KYC`}
      />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Worker</Th>
              <Th>Role</Th>
              <Th>Home</Th>
              <Th>Exp</Th>
              <Th>Rating</Th>
              <Th>Expected</Th>
              <Th>Availability</Th>
              <Th>KYC</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id}>
                <Td className="font-medium text-slate-800">{w.name}</Td>
                <Td>{w.primaryRole.name}</Td>
                <Td className="text-xs">
                  {w.homeHotel.name}
                  <span className="block text-slate-400">{w.homeHotel.region.state}</span>
                </Td>
                <Td>{w.experienceYears}y</Td>
                <Td>★ {w.reputationScore.toFixed(1)}</Td>
                <Td>{formatINR(w.expectedWagePaise)}</Td>
                <Td>
                  <Badge tone={w.availabilityStatus === "AVAILABLE" ? "green" : w.availabilityStatus === "ON_DEPUTATION" ? "amber" : "slate"}>
                    {w.availabilityStatus.replace("_", " ")}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={w.kycStatus === "VERIFIED" ? "green" : w.kycStatus === "REJECTED" ? "red" : "amber"}>
                    {w.kycStatus}
                  </Badge>
                </Td>
                <Td>
                  {w.kycStatus !== "VERIFIED" ? (
                    <form action={setKyc}>
                      <input type="hidden" name="workerId" value={w.id} />
                      <input type="hidden" name="status" value="VERIFIED" />
                      <SubmitButton size="sm" variant="secondary" pendingText="…">Verify KYC</SubmitButton>
                    </form>
                  ) : (
                    <form action={setKyc}>
                      <input type="hidden" name="workerId" value={w.id} />
                      <input type="hidden" name="status" value="PENDING" />
                      <button className="text-xs text-slate-400 hover:text-red-600">Revoke</button>
                    </form>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
