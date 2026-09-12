import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { REVENUE_MODULE_CATALOG } from "../src/core/monetization";

const prisma = new PrismaClient();
const PW = bcrypt.hashSync("password123", 10);
const DAY = 86400000;
const d = (days: number) => new Date(Date.now() + days * DAY);

type S = "PEAK" | "SHOULDER" | "OFF";
const P: S = "PEAK";
const SH: S = "SHOULDER";
const O: S = "OFF";

// Seasonal archetypes (Jan..Dec) shared by climatically-similar states.
const ARCHETYPES: Record<string, { dominantType: string; months: S[] }> = {
  HIMALAYAN: { dominantType: "MOUNTAIN", months: [O, O, SH, P, P, P, SH, SH, P, P, SH, O] },
  NORTHEAST: { dominantType: "MOUNTAIN", months: [SH, SH, P, P, P, SH, O, O, SH, P, P, SH] },
  DESERT: { dominantType: "DESERT", months: [P, P, SH, O, O, O, O, SH, SH, P, P, P] },
  WEST_COAST: { dominantType: "BEACH", months: [P, P, SH, SH, O, O, O, O, O, SH, P, P] },
  SOUTH: { dominantType: "COASTAL", months: [P, P, SH, SH, O, O, O, SH, SH, SH, P, P] },
  GANGETIC: { dominantType: "PILGRIMAGE", months: [P, P, SH, SH, O, O, SH, SH, SH, P, P, P] },
  EAST_COAST: { dominantType: "COASTAL", months: [P, P, SH, SH, O, O, SH, SH, SH, P, P, P] },
  CENTRAL: { dominantType: "WILDLIFE", months: [P, P, P, P, SH, SH, O, O, O, SH, P, P] },
  DECCAN: { dominantType: "HERITAGE", months: [P, P, SH, SH, O, O, SH, SH, SH, P, P, P] },
  METRO: { dominantType: "BUSINESS", months: [SH, P, P, SH, O, O, SH, SH, P, P, P, SH] },
  ISLAND: { dominantType: "ISLAND", months: [P, P, P, SH, O, O, O, O, SH, SH, P, P] },
};

// All 28 states + 8 union territories — full India coverage.
const STATES: { code: string; name: string; zone: string; arch: keyof typeof ARCHETYPES }[] = [
  // North
  { code: "JK", name: "Jammu & Kashmir", zone: "NORTH", arch: "HIMALAYAN" },
  { code: "LA", name: "Ladakh", zone: "NORTH", arch: "HIMALAYAN" },
  { code: "HP", name: "Himachal Pradesh", zone: "NORTH", arch: "HIMALAYAN" },
  { code: "UK", name: "Uttarakhand", zone: "NORTH", arch: "HIMALAYAN" },
  { code: "PB", name: "Punjab", zone: "NORTH", arch: "GANGETIC" },
  { code: "HR", name: "Haryana", zone: "NORTH", arch: "GANGETIC" },
  { code: "CH", name: "Chandigarh", zone: "NORTH", arch: "METRO" },
  { code: "DL", name: "Delhi", zone: "NORTH", arch: "METRO" },
  { code: "UP", name: "Uttar Pradesh", zone: "NORTH", arch: "GANGETIC" },
  // West
  { code: "RJ", name: "Rajasthan", zone: "WEST", arch: "DESERT" },
  { code: "GJ", name: "Gujarat", zone: "WEST", arch: "DESERT" },
  { code: "GA", name: "Goa", zone: "WEST", arch: "WEST_COAST" },
  { code: "MH", name: "Maharashtra", zone: "WEST", arch: "DECCAN" },
  { code: "DD", name: "Dadra & Nagar Haveli and Daman & Diu", zone: "WEST", arch: "WEST_COAST" },
  // South
  { code: "KA", name: "Karnataka", zone: "SOUTH", arch: "SOUTH" },
  { code: "KL", name: "Kerala", zone: "SOUTH", arch: "SOUTH" },
  { code: "TN", name: "Tamil Nadu", zone: "SOUTH", arch: "SOUTH" },
  { code: "AP", name: "Andhra Pradesh", zone: "SOUTH", arch: "SOUTH" },
  { code: "TG", name: "Telangana", zone: "SOUTH", arch: "DECCAN" },
  { code: "PY", name: "Puducherry", zone: "SOUTH", arch: "SOUTH" },
  // East
  { code: "BR", name: "Bihar", zone: "EAST", arch: "GANGETIC" },
  { code: "JH", name: "Jharkhand", zone: "EAST", arch: "GANGETIC" },
  { code: "OD", name: "Odisha", zone: "EAST", arch: "EAST_COAST" },
  { code: "WB", name: "West Bengal", zone: "EAST", arch: "EAST_COAST" },
  // Central
  { code: "MP", name: "Madhya Pradesh", zone: "CENTRAL", arch: "CENTRAL" },
  { code: "CG", name: "Chhattisgarh", zone: "CENTRAL", arch: "CENTRAL" },
  // North-East
  { code: "SK", name: "Sikkim", zone: "NORTHEAST", arch: "HIMALAYAN" },
  { code: "AS", name: "Assam", zone: "NORTHEAST", arch: "NORTHEAST" },
  { code: "AR", name: "Arunachal Pradesh", zone: "NORTHEAST", arch: "HIMALAYAN" },
  { code: "NL", name: "Nagaland", zone: "NORTHEAST", arch: "NORTHEAST" },
  { code: "MN", name: "Manipur", zone: "NORTHEAST", arch: "NORTHEAST" },
  { code: "MZ", name: "Mizoram", zone: "NORTHEAST", arch: "NORTHEAST" },
  { code: "ML", name: "Meghalaya", zone: "NORTHEAST", arch: "NORTHEAST" },
  { code: "TR", name: "Tripura", zone: "NORTHEAST", arch: "NORTHEAST" },
  // Islands
  { code: "AN", name: "Andaman & Nicobar Islands", zone: "ISLANDS", arch: "ISLAND" },
  { code: "LD", name: "Lakshadweep", zone: "ISLANDS", arch: "ISLAND" },
];

const ROLES = [
  { name: "Housekeeping", category: "HOUSEKEEPING" },
  { name: "Front Desk", category: "FRONT_OFFICE" },
  { name: "Cook", category: "KITCHEN" },
  { name: "Kitchen Helper", category: "KITCHEN" },
  { name: "F&B Steward", category: "FNB" },
  { name: "Maintenance", category: "MAINTENANCE" },
  { name: "Spa Therapist", category: "WELLNESS" },
  { name: "Security Guard", category: "SECURITY" },
  { name: "Driver", category: "OTHER" },
];

async function wipe() {
  await prisma.rating.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.agreement.deleteMany();
  await prisma.deputation.deleteMany();
  await prisma.seasonDeclaration.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.hotelGroup.deleteMany();
  await prisma.seasonalPack.deleteMany();
  await prisma.region.deleteMany();
  await prisma.role.deleteMany();
  await prisma.revenueModule.deleteMany();
}

async function main() {
  await wipe();

  // Regions (all states + UTs) + seasonal packs from archetypes
  const regionId: Record<string, string> = {};
  for (const st of STATES) {
    const arch = ARCHETYPES[st.arch];
    const region = await prisma.region.create({
      data: { code: st.code, name: st.name, zone: st.zone, dominantType: arch.dominantType },
    });
    regionId[st.code] = region.id;
    await prisma.seasonalPack.createMany({
      data: arch.months.map((state, i) => ({ regionId: region.id, month: i + 1, state })),
    });
  }

  // Roles
  const roleId: Record<string, string> = {};
  for (const role of ROLES) {
    const created = await prisma.role.create({ data: role });
    roleId[role.name] = created.id;
  }

  // Revenue modules (subscription + commission ON by default; rest OFF)
  for (const m of REVENUE_MODULE_CATALOG) {
    await prisma.revenueModule.create({
      data: {
        key: m.key,
        name: m.name,
        description: m.description,
        enabled: m.defaultEnabled,
        configJson: JSON.stringify(m.defaultConfig),
        sortOrder: m.sortOrder,
      },
    });
  }

  // Hotels — Goa (off-season now) lends to Himachal (peak now)
  const group = await prisma.hotelGroup.create({ data: { name: "Coast & Peaks Hospitality" } });

  const hotelA = await prisma.hotel.create({
    data: { name: "Sunset Sands Resort", groupId: group.id, regionId: regionId["GA"], city: "Panaji, Goa", rooms: 42, tier: "MID" },
  });
  const hotelB = await prisma.hotel.create({
    data: { name: "Himalayan Vista Inn", groupId: group.id, regionId: regionId["HP"], city: "Manali, Himachal Pradesh", rooms: 34, tier: "MID" },
  });
  const hotelC = await prisma.hotel.create({
    data: { name: "Desert Pearl Haveli", regionId: regionId["RJ"], city: "Jaisalmer, Rajasthan", rooms: 22, tier: "BUDGET" },
  });

  await prisma.subscription.create({ data: { hotelId: hotelA.id, plan: "GROWTH", status: "ACTIVE", currentPeriodEnd: d(30) } });
  await prisma.subscription.create({ data: { hotelId: hotelB.id, plan: "STARTER", status: "ACTIVE", currentPeriodEnd: d(30) } });
  await prisma.subscription.create({ data: { hotelId: hotelC.id, plan: "FREE", status: "ACTIVE" } });

  // Workers — home at Hotel A (Goa), off-season now => prime to lend
  const workerSeed = [
    { name: "Ramesh Kumar", role: "Housekeeping", exp: 6, wage: 70000, rep: 4.6, kyc: "VERIFIED", skills: ["deep cleaning", "laundry"] },
    { name: "Suresh Naik", role: "Cook", exp: 8, wage: 120000, rep: 4.8, kyc: "VERIFIED", skills: ["north indian", "tandoor", "continental"] },
    { name: "Priya Fernandes", role: "Front Desk", exp: 4, wage: 90000, rep: 4.3, kyc: "VERIFIED", skills: ["reservations", "english", "hindi"] },
    { name: "Anil Gaonkar", role: "F&B Steward", exp: 3, wage: 65000, rep: 4.0, kyc: "PENDING", skills: ["banquet", "room service"] },
    { name: "Kavita Shetty", role: "Housekeeping", exp: 5, wage: 68000, rep: 4.5, kyc: "VERIFIED", skills: ["housekeeping", "spa assist"] },
  ];
  const workers = [];
  for (const w of workerSeed) {
    workers.push(
      await prisma.worker.create({
        data: {
          name: w.name,
          homeHotelId: hotelA.id,
          primaryRoleId: roleId[w.role],
          skillsJson: JSON.stringify(w.skills),
          experienceYears: w.exp,
          expectedWagePaise: w.wage,
          reputationScore: w.rep,
          ratingCount: Math.round(w.rep * 4),
          kycStatus: w.kyc,
          availabilityStatus: "AVAILABLE",
          consentGiven: true,
        },
      }),
    );
  }

  // Users
  await prisma.user.create({ data: { email: "admin@ht.test", passwordHash: PW, name: "Platform Admin", role: "PLATFORM_ADMIN" } });
  await prisma.user.create({ data: { email: "goa@ht.test", passwordHash: PW, name: "Goa GM (Sunset Sands)", role: "HOTELIER_ADMIN", hotelId: hotelA.id } });
  await prisma.user.create({ data: { email: "hills@ht.test", passwordHash: PW, name: "Manali GM (Himalayan Vista)", role: "HOTELIER_ADMIN", hotelId: hotelB.id } });
  await prisma.user.create({ data: { email: "raj@ht.test", passwordHash: PW, name: "Jaisalmer GM (Desert Pearl)", role: "HOTELIER_ADMIN", hotelId: hotelC.id } });
  await prisma.user.create({ data: { email: "worker@ht.test", passwordHash: PW, name: workers[0].name, role: "WORKER", workerId: workers[0].id } });

  // Declarations — A surplus (Goa off), B demand (Himachal peak)
  await prisma.seasonDeclaration.create({
    data: { hotelId: hotelA.id, type: "SURPLUS", roleId: roleId["Housekeeping"], headcount: 3, startDate: d(7), endDate: d(97), wageOfferPaise: 70000, housingProvided: true, note: "Off-season surplus — trained coastal housekeeping available to lend." },
  });
  await prisma.seasonDeclaration.create({
    data: { hotelId: hotelA.id, type: "SURPLUS", roleId: roleId["Cook"], headcount: 1, startDate: d(7), endDate: d(97), wageOfferPaise: 120000, housingProvided: true, note: "Experienced multi-cuisine cook available during monsoon lull." },
  });
  await prisma.seasonDeclaration.create({
    data: { hotelId: hotelB.id, type: "DEMAND", roleId: roleId["Housekeeping"], headcount: 2, startDate: d(14), endDate: d(104), wageOfferPaise: 90000, housingProvided: true, note: "Autumn peak — need experienced housekeeping, staff quarters provided." },
  });
  await prisma.seasonDeclaration.create({
    data: { hotelId: hotelB.id, type: "DEMAND", roleId: roleId["Cook"], headcount: 1, startDate: d(14), endDate: d(104), wageOfferPaise: 130000, housingProvided: true, note: "Peak-season kitchen support needed." },
  });

  console.log("Seed complete:");
  console.log(`  ${STATES.length} regions (all states + UTs) × 12 seasonal packs`);
  console.log(`  ${ROLES.length} roles, ${REVENUE_MODULE_CATALOG.length} revenue modules`);
  console.log(`  3 hotels, ${workers.length} workers, 4 declarations`);
  console.log("\nDemo logins (password: password123):");
  console.log("  admin@ht.test | goa@ht.test | hills@ht.test | raj@ht.test | worker@ht.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
