import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { REVENUE_MODULE_CATALOG } from "../src/core/monetization";

const prisma = new PrismaClient();
const PW = bcrypt.hashSync("password123", 10);
const DAY = 86400000;
const d = (days: number) => new Date(Date.now() + days * DAY);

type S = "PEAK" | "SHOULDER" | "OFF";

interface RegionSeed {
  code: string;
  name: string;
  zone: string;
  dominantType: string;
  months: S[]; // Jan..Dec
}

// Pan-India seasonal calendar. Calibrated so September (current month) has live
// OFF regions (surplus) and PEAK regions (demand) to make the demo work today.
const REGIONS: RegionSeed[] = [
  {
    code: "NORTH_HILLS",
    name: "North Himalayan Hills (HP · Uttarakhand · J&K)",
    zone: "NORTH",
    dominantType: "MOUNTAIN",
    months: ["OFF", "OFF", "SHOULDER", "PEAK", "PEAK", "PEAK", "SHOULDER", "SHOULDER", "PEAK", "PEAK", "SHOULDER", "OFF"],
  },
  {
    code: "RAJASTHAN",
    name: "Rajasthan Desert (Jaisalmer · Jodhpur · Udaipur)",
    zone: "WEST",
    dominantType: "DESERT",
    months: ["PEAK", "PEAK", "SHOULDER", "OFF", "OFF", "OFF", "OFF", "SHOULDER", "SHOULDER", "PEAK", "PEAK", "PEAK"],
  },
  {
    code: "GOA",
    name: "Goa & Konkan Coast",
    zone: "WEST",
    dominantType: "BEACH",
    months: ["PEAK", "PEAK", "SHOULDER", "SHOULDER", "OFF", "OFF", "OFF", "OFF", "OFF", "SHOULDER", "PEAK", "PEAK"],
  },
  {
    code: "KERALA",
    name: "Kerala Backwaters & Coast",
    zone: "SOUTH",
    dominantType: "BACKWATER",
    months: ["PEAK", "PEAK", "SHOULDER", "SHOULDER", "OFF", "OFF", "OFF", "SHOULDER", "SHOULDER", "SHOULDER", "PEAK", "PEAK"],
  },
  {
    code: "TN_HILLS_TEMPLE",
    name: "Tamil Nadu Hills & Temples (Ooty · Madurai)",
    zone: "SOUTH",
    dominantType: "HILL_TEMPLE",
    months: ["SHOULDER", "SHOULDER", "SHOULDER", "PEAK", "PEAK", "PEAK", "SHOULDER", "SHOULDER", "SHOULDER", "SHOULDER", "SHOULDER", "PEAK"],
  },
  {
    code: "BENGAL_SIKKIM_NE",
    name: "Bengal · Sikkim · North-East (Darjeeling · Gangtok)",
    zone: "NORTHEAST",
    dominantType: "MOUNTAIN",
    months: ["SHOULDER", "SHOULDER", "PEAK", "PEAK", "PEAK", "SHOULDER", "OFF", "OFF", "SHOULDER", "PEAK", "PEAK", "SHOULDER"],
  },
  {
    code: "ODISHA_PILGRIMAGE",
    name: "Eastern Pilgrimage Circuit (Puri · Varanasi · Gaya)",
    zone: "EAST",
    dominantType: "PILGRIMAGE",
    months: ["PEAK", "SHOULDER", "SHOULDER", "PEAK", "PEAK", "SHOULDER", "PEAK", "SHOULDER", "SHOULDER", "PEAK", "PEAK", "PEAK"],
  },
  {
    code: "CENTRAL_WILDLIFE",
    name: "Central Heritage & Wildlife (Khajuraho · Kanha)",
    zone: "CENTRAL",
    dominantType: "WILDLIFE",
    months: ["PEAK", "PEAK", "PEAK", "PEAK", "SHOULDER", "SHOULDER", "OFF", "OFF", "OFF", "SHOULDER", "PEAK", "PEAK"],
  },
  {
    code: "METRO",
    name: "Metro Business Hubs (Delhi · Mumbai · Bengaluru)",
    zone: "CENTRAL",
    dominantType: "BUSINESS",
    months: ["SHOULDER", "PEAK", "PEAK", "SHOULDER", "OFF", "OFF", "SHOULDER", "SHOULDER", "PEAK", "PEAK", "PEAK", "SHOULDER"],
  },
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

  // Regions + seasonal packs
  const regionId: Record<string, string> = {};
  for (const r of REGIONS) {
    const region = await prisma.region.create({
      data: { code: r.code, name: r.name, zone: r.zone, dominantType: r.dominantType },
    });
    regionId[r.code] = region.id;
    await prisma.seasonalPack.createMany({
      data: r.months.map((state, i) => ({ regionId: region.id, month: i + 1, state })),
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

  // Hotels
  const group = await prisma.hotelGroup.create({ data: { name: "Coast & Peaks Hospitality" } });

  const hotelA = await prisma.hotel.create({
    data: {
      name: "Sunset Sands Resort",
      groupId: group.id,
      regionId: regionId["GOA"],
      city: "Panaji, Goa",
      rooms: 42,
      tier: "MID",
    },
  });
  const hotelB = await prisma.hotel.create({
    data: {
      name: "Himalayan Vista Inn",
      groupId: group.id,
      regionId: regionId["NORTH_HILLS"],
      city: "Manali, Himachal Pradesh",
      rooms: 34,
      tier: "MID",
    },
  });
  const hotelC = await prisma.hotel.create({
    data: {
      name: "Desert Pearl Haveli",
      regionId: regionId["RAJASTHAN"],
      city: "Jaisalmer, Rajasthan",
      rooms: 22,
      tier: "BUDGET",
    },
  });

  // Subscriptions
  await prisma.subscription.create({
    data: { hotelId: hotelA.id, plan: "GROWTH", status: "ACTIVE", currentPeriodEnd: d(30) },
  });
  await prisma.subscription.create({
    data: { hotelId: hotelB.id, plan: "STARTER", status: "ACTIVE", currentPeriodEnd: d(30) },
  });
  await prisma.subscription.create({
    data: { hotelId: hotelC.id, plan: "FREE", status: "ACTIVE" },
  });

  // Workers — all home at Hotel A (Goa), which is OFF-season now => prime to lend
  const workerSeed = [
    { name: "Ramesh Kumar", role: "Housekeeping", exp: 6, wage: 70000, rep: 4.6, kyc: "VERIFIED", skills: ["deep cleaning", "laundry"] },
    { name: "Suresh Naik", role: "Cook", exp: 8, wage: 120000, rep: 4.8, kyc: "VERIFIED", skills: ["north indian", "tandoor", "continental"] },
    { name: "Priya Fernandes", role: "Front Desk", exp: 4, wage: 90000, rep: 4.3, kyc: "VERIFIED", skills: ["reservations", "english", "hindi"] },
    { name: "Anil Gaonkar", role: "F&B Steward", exp: 3, wage: 65000, rep: 4.0, kyc: "PENDING", skills: ["banquet", "room service"] },
    { name: "Kavita Shetty", role: "Housekeeping", exp: 5, wage: 68000, rep: 4.5, kyc: "VERIFIED", skills: ["housekeeping", "spa assist"] },
  ];
  const workers = [];
  for (const w of workerSeed) {
    const worker = await prisma.worker.create({
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
    });
    workers.push(worker);
  }

  // Users
  await prisma.user.create({
    data: { email: "admin@ht.test", passwordHash: PW, name: "Platform Admin", role: "PLATFORM_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "goa@ht.test", passwordHash: PW, name: "Goa GM (Sunset Sands)", role: "HOTELIER_ADMIN", hotelId: hotelA.id },
  });
  await prisma.user.create({
    data: { email: "hills@ht.test", passwordHash: PW, name: "Manali GM (Himalayan Vista)", role: "HOTELIER_ADMIN", hotelId: hotelB.id },
  });
  await prisma.user.create({
    data: { email: "raj@ht.test", passwordHash: PW, name: "Jaisalmer GM (Desert Pearl)", role: "HOTELIER_ADMIN", hotelId: hotelC.id },
  });
  await prisma.user.create({
    data: { email: "worker@ht.test", passwordHash: PW, name: workers[0].name, role: "WORKER", workerId: workers[0].id },
  });

  // Declarations — A is SURPLUS (Goa off-season), B is DEMAND (Himalayas peak)
  await prisma.seasonDeclaration.create({
    data: {
      hotelId: hotelA.id, type: "SURPLUS", roleId: roleId["Housekeeping"], headcount: 3,
      startDate: d(7), endDate: d(97), wageOfferPaise: 70000, housingProvided: true,
      note: "Off-season surplus — trained coastal housekeeping available to lend.",
    },
  });
  await prisma.seasonDeclaration.create({
    data: {
      hotelId: hotelA.id, type: "SURPLUS", roleId: roleId["Cook"], headcount: 1,
      startDate: d(7), endDate: d(97), wageOfferPaise: 120000, housingProvided: true,
      note: "Experienced multi-cuisine cook available during monsoon lull.",
    },
  });
  await prisma.seasonDeclaration.create({
    data: {
      hotelId: hotelB.id, type: "DEMAND", roleId: roleId["Housekeeping"], headcount: 2,
      startDate: d(14), endDate: d(104), wageOfferPaise: 90000, housingProvided: true,
      note: "Autumn peak — need experienced housekeeping, staff quarters provided.",
    },
  });
  await prisma.seasonDeclaration.create({
    data: {
      hotelId: hotelB.id, type: "DEMAND", roleId: roleId["Cook"], headcount: 1,
      startDate: d(14), endDate: d(104), wageOfferPaise: 130000, housingProvided: true,
      note: "Peak-season kitchen support needed.",
    },
  });

  console.log("Seed complete:");
  console.log(`  ${REGIONS.length} regions × 12 seasonal packs`);
  console.log(`  ${ROLES.length} roles, ${REVENUE_MODULE_CATALOG.length} revenue modules`);
  console.log(`  3 hotels, ${workers.length} workers, 4 declarations`);
  console.log("\nDemo logins (password: password123):");
  console.log("  admin@ht.test   — platform admin");
  console.log("  goa@ht.test     — Sunset Sands Resort, Goa (SURPLUS, off-season)");
  console.log("  hills@ht.test   — Himalayan Vista Inn, Manali (DEMAND, peak)");
  console.log("  raj@ht.test     — Desert Pearl Haveli, Jaisalmer");
  console.log("  worker@ht.test  — worker (Ramesh Kumar)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
