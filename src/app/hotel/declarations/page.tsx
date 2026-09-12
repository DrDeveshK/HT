import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createDeclaration, closeDeclaration } from "@/actions/declarations";
import { SubmitButton } from "@/components/SubmitButton";
import {
  PageHeader,
  Card,
  CardHeader,
  Table,
  Th,
  Td,
  Field,
  Input,
  Select,
  Badge,
  EmptyState,
} from "@/components/ui";
import { formatINR, formatDate } from "@/lib/constants";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function Declarations() {
  const user = await requireRole("HOTELIER_ADMIN");
  const hotel = user.hotel!;
  const [roles, decls] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.seasonDeclaration.findMany({
      where: { hotelId: hotel.id },
      include: { role: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader title="My declarations" subtitle="Declare surplus staff to lend, or demand for staff you need." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title="New declaration" />
          <form action={createDeclaration} className="space-y-4 p-5">
            <Field label="Type">
              <Select name="type" defaultValue="SURPLUS">
                <option value="SURPLUS">Surplus — staff to lend</option>
                <option value="DEMAND">Demand — staff needed</option>
              </Select>
            </Field>
            <Field label="Role">
              <Select name="roleId" required defaultValue="">
                <option value="" disabled>Select a role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Headcount"><Input name="headcount" type="number" min={1} defaultValue={1} /></Field>
              <Field label="Daily wage (₹)"><Input name="wageRupees" type="number" min={0} defaultValue={700} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="From"><Input name="startDate" type="date" defaultValue={iso(new Date(Date.now() + 7 * 86400000))} /></Field>
              <Field label="To"><Input name="endDate" type="date" defaultValue={iso(new Date(Date.now() + 97 * 86400000))} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="housingProvided" defaultChecked /> Housing provided
            </label>
            <SubmitButton pendingText="Saving…">Create declaration</SubmitButton>
          </form>
        </Card>

        <Card>
          <CardHeader title="Your declarations" />
          <div className="p-2">
            {decls.length === 0 ? (
              <div className="p-4"><EmptyState title="No declarations yet" /></div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Type</Th>
                    <Th>Role</Th>
                    <Th>Window</Th>
                    <Th>Wage</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {decls.map((d) => (
                    <tr key={d.id}>
                      <Td><Badge tone={d.type === "SURPLUS" ? "blue" : "red"}>{d.type}</Badge></Td>
                      <Td>{d.role.name} ×{d.headcount}</Td>
                      <Td className="whitespace-nowrap text-xs">{formatDate(d.startDate)} – {formatDate(d.endDate)}</Td>
                      <Td>{formatINR(d.wageOfferPaise)}</Td>
                      <Td><Badge tone={d.status === "OPEN" ? "green" : "slate"}>{d.status}</Badge></Td>
                      <Td>
                        {d.status === "OPEN" && (
                          <form action={closeDeclaration}>
                            <input type="hidden" name="id" value={d.id} />
                            <button className="text-xs text-slate-400 hover:text-red-600">Close</button>
                          </form>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
