import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { writeDeputationLedger } from "@/lib/fees";

// Integration test against the seeded SQLite DB. Proves the full money split:
// borrower pays wage + commission, worker gets the wage, platform keeps the fee.
let createdDepId: string | null = null;

describe("deputation ledger (integration)", () => {
  afterAll(async () => {
    if (createdDepId) {
      await prisma.ledgerEntry.deleteMany({ where: { deputationId: createdDepId } });
      await prisma.deputation.delete({ where: { id: createdDepId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("writes a money split honouring enabled revenue modules", async () => {
    const worker = await prisma.worker.findFirst({ where: { name: "Ramesh Kumar" } });
    const demandHotel = await prisma.hotel.findFirst({ where: { name: "Himalayan Vista Inn" } });
    expect(worker, "seed worker present").toBeTruthy();
    expect(demandHotel, "seed hotel present").toBeTruthy();
    if (!worker || !demandHotel) return;

    const dep = await prisma.deputation.create({
      data: {
        workerId: worker.id,
        homeHotelId: worker.homeHotelId,
        demandHotelId: demandHotel.id,
        roleId: worker.primaryRoleId,
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-31"), // 30 days
        wagePerDayPaise: 100000, // ₹1000/day => wage bill ₹30,000
        housingProvided: true,
        state: "AGREED",
      },
    });
    createdDepId = dep.id;

    const result = await writeDeputationLedger(dep.id);
    expect(result).not.toBeNull();

    const entries = await prisma.ledgerEntry.findMany({ where: { deputationId: dep.id } });
    const revenue = entries
      .filter((e) => e.direction === "REVENUE")
      .reduce((s, e) => s + e.amountPaise, 0);
    const toWorker = entries
      .filter((e) => e.payeeType === "WORKER")
      .reduce((s, e) => s + e.amountPaise, 0);

    expect(toWorker).toBe(3000000); // full wage bill to worker
    expect(revenue).toBe(450000); // default 15% commission to platform
  });
});
