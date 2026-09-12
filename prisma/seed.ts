import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { REVENUE_MODULE_CATALOG } from "../src/core/monetization";
import { aggregateWorker, aggregateHotel } from "../src/core/reputation";

const prisma = new PrismaClient();
const PW = bcrypt.hashSync("password123", 10);
const DAY = 86400000;
const d = (days: number) => new Date(Date.now() + days * DAY);

type S = "PEAK" | "SHOULDER" | "OFF";
const P: S = "PEAK";
const SH: S = "SHOULDER";
const O: S = "OFF";

// Seasonal archetypes (Jan..Dec) assigned per HOTSPOT (not per state), so a
// single state can hold hotspots with opposite seasons (e.g. Jaisalmer/DESERT
// vs Mount Abu/HILL, or Srinagar/HIMALAYAN vs Gulmarg/SKI).
const ARCH = {
  HIMALAYAN: { type: "MOUNTAIN", m: [O, O, SH, P, P, P, SH, SH, P, P, SH, O] },
  SKI: { type: "MOUNTAIN", m: [P, P, P, SH, SH, O, O, O, SH, SH, P, P] },
  HILL: { type: "HILL", m: [SH, SH, SH, P, P, P, O, O, SH, P, P, SH] },
  DESERT: { type: "DESERT", m: [P, P, SH, O, O, O, O, SH, SH, P, P, P] },
  WEST_COAST: { type: "BEACH", m: [P, P, SH, SH, O, O, O, O, O, SH, P, P] },
  EAST_COAST: { type: "BEACH", m: [P, P, SH, SH, O, O, SH, SH, SH, P, P, P] },
  BACKWATER: { type: "BACKWATER", m: [P, P, SH, SH, O, O, O, SH, SH, SH, P, P] },
  PILGRIMAGE: { type: "PILGRIMAGE", m: [P, P, SH, SH, O, O, SH, SH, SH, P, P, P] },
  WILDLIFE: { type: "WILDLIFE", m: [P, P, P, P, SH, SH, O, O, O, SH, P, P] },
  HERITAGE: { type: "HERITAGE", m: [P, P, SH, SH, O, O, SH, SH, SH, P, P, P] },
  METRO: { type: "BUSINESS", m: [SH, P, P, SH, O, O, SH, SH, P, P, P, SH] },
  ISLAND: { type: "ISLAND", m: [P, P, P, SH, O, O, O, O, SH, SH, P, P] },
} satisfies Record<string, { type: string; m: S[] }>;

type ArchKey = keyof typeof ARCH;

interface StateDef {
  code: string;
  name: string;
  zone: string;
  def: ArchKey; // archetype for the "Rest of <state>" fallback
  spots: [string, ArchKey][];
}

// Curated top hotspots per state/UT (+ a fallback so any town can onboard).
const STATES: StateDef[] = [
  // ---------------- NORTH ----------------
  { code: "JK", name: "Jammu & Kashmir", zone: "NORTH", def: "HIMALAYAN", spots: [["Srinagar", "HIMALAYAN"], ["Gulmarg", "SKI"], ["Pahalgam", "HIMALAYAN"], ["Sonamarg", "HIMALAYAN"], ["Katra (Vaishno Devi)", "PILGRIMAGE"], ["Jammu", "HERITAGE"]] },
  { code: "LA", name: "Ladakh", zone: "NORTH", def: "HIMALAYAN", spots: [["Leh", "HIMALAYAN"], ["Nubra Valley", "HIMALAYAN"], ["Pangong Tso", "HIMALAYAN"]] },
  { code: "HP", name: "Himachal Pradesh", zone: "NORTH", def: "HIMALAYAN", spots: [["Shimla", "HIMALAYAN"], ["Manali", "HIMALAYAN"], ["Dharamshala", "HIMALAYAN"], ["Dalhousie", "HIMALAYAN"], ["Kasol", "HIMALAYAN"], ["Spiti Valley", "HIMALAYAN"]] },
  { code: "UK", name: "Uttarakhand", zone: "NORTH", def: "HILL", spots: [["Nainital", "HILL"], ["Mussoorie", "HILL"], ["Rishikesh", "PILGRIMAGE"], ["Haridwar", "PILGRIMAGE"], ["Kedarnath (Char Dham)", "HIMALAYAN"], ["Jim Corbett", "WILDLIFE"], ["Auli", "SKI"]] },
  { code: "PB", name: "Punjab", zone: "NORTH", def: "HERITAGE", spots: [["Amritsar", "PILGRIMAGE"], ["Ludhiana", "METRO"], ["Patiala", "HERITAGE"]] },
  { code: "HR", name: "Haryana", zone: "NORTH", def: "HERITAGE", spots: [["Gurugram", "METRO"], ["Kurukshetra", "PILGRIMAGE"], ["Morni Hills", "HILL"]] },
  { code: "CH", name: "Chandigarh", zone: "NORTH", def: "METRO", spots: [["Chandigarh", "METRO"]] },
  { code: "DL", name: "Delhi", zone: "NORTH", def: "HERITAGE", spots: [["New Delhi", "HERITAGE"]] },
  { code: "UP", name: "Uttar Pradesh", zone: "NORTH", def: "HERITAGE", spots: [["Agra", "HERITAGE"], ["Varanasi", "PILGRIMAGE"], ["Ayodhya", "PILGRIMAGE"], ["Mathura-Vrindavan", "PILGRIMAGE"], ["Lucknow", "HERITAGE"], ["Prayagraj", "PILGRIMAGE"]] },
  // ---------------- WEST ----------------
  { code: "RJ", name: "Rajasthan", zone: "WEST", def: "DESERT", spots: [["Jaisalmer", "DESERT"], ["Jodhpur", "DESERT"], ["Udaipur", "HERITAGE"], ["Jaipur", "HERITAGE"], ["Pushkar", "PILGRIMAGE"], ["Mount Abu", "HILL"], ["Ranthambore", "WILDLIFE"], ["Bikaner", "DESERT"]] },
  { code: "GJ", name: "Gujarat", zone: "WEST", def: "HERITAGE", spots: [["Rann of Kutch", "DESERT"], ["Gir", "WILDLIFE"], ["Dwarka", "PILGRIMAGE"], ["Somnath", "PILGRIMAGE"], ["Saputara", "HILL"], ["Ahmedabad", "HERITAGE"], ["Kevadia (Statue of Unity)", "HERITAGE"]] },
  { code: "GA", name: "Goa", zone: "WEST", def: "WEST_COAST", spots: [["North Goa", "WEST_COAST"], ["South Goa", "WEST_COAST"], ["Panaji", "WEST_COAST"]] },
  { code: "MH", name: "Maharashtra", zone: "WEST", def: "HERITAGE", spots: [["Mumbai", "METRO"], ["Pune", "METRO"], ["Lonavala", "HILL"], ["Mahabaleshwar", "HILL"], ["Alibaug (Konkan)", "WEST_COAST"], ["Nashik", "HERITAGE"], ["Tadoba", "WILDLIFE"], ["Matheran", "HILL"]] },
  { code: "DD", name: "Dadra & Nagar Haveli and Daman & Diu", zone: "WEST", def: "WEST_COAST", spots: [["Daman", "WEST_COAST"], ["Diu", "WEST_COAST"], ["Silvassa", "HERITAGE"]] },
  // ---------------- SOUTH ----------------
  { code: "KA", name: "Karnataka", zone: "SOUTH", def: "HERITAGE", spots: [["Bengaluru", "METRO"], ["Coorg (Madikeri)", "HILL"], ["Chikmagalur", "HILL"], ["Gokarna", "WEST_COAST"], ["Hampi", "HERITAGE"], ["Mysuru", "HERITAGE"]] },
  { code: "KL", name: "Kerala", zone: "SOUTH", def: "BACKWATER", spots: [["Munnar", "HILL"], ["Alleppey", "BACKWATER"], ["Kochi", "BACKWATER"], ["Kovalam", "WEST_COAST"], ["Wayanad", "HILL"], ["Thekkady", "WILDLIFE"]] },
  { code: "TN", name: "Tamil Nadu", zone: "SOUTH", def: "HERITAGE", spots: [["Ooty", "HILL"], ["Kodaikanal", "HILL"], ["Chennai", "METRO"], ["Madurai", "PILGRIMAGE"], ["Mahabalipuram", "EAST_COAST"], ["Rameswaram", "PILGRIMAGE"], ["Kanyakumari", "EAST_COAST"]] },
  { code: "AP", name: "Andhra Pradesh", zone: "SOUTH", def: "HERITAGE", spots: [["Tirupati", "PILGRIMAGE"], ["Visakhapatnam", "EAST_COAST"], ["Araku Valley", "HILL"]] },
  { code: "TG", name: "Telangana", zone: "SOUTH", def: "HERITAGE", spots: [["Hyderabad", "METRO"], ["Warangal", "HERITAGE"]] },
  { code: "PY", name: "Puducherry", zone: "SOUTH", def: "EAST_COAST", spots: [["Puducherry", "EAST_COAST"]] },
  // ---------------- EAST ----------------
  { code: "BR", name: "Bihar", zone: "EAST", def: "PILGRIMAGE", spots: [["Bodh Gaya", "PILGRIMAGE"], ["Patna", "HERITAGE"], ["Nalanda", "HERITAGE"], ["Rajgir", "PILGRIMAGE"]] },
  { code: "JH", name: "Jharkhand", zone: "EAST", def: "HILL", spots: [["Ranchi", "HILL"], ["Deoghar", "PILGRIMAGE"], ["Netarhat", "HILL"]] },
  { code: "OD", name: "Odisha", zone: "EAST", def: "EAST_COAST", spots: [["Puri", "EAST_COAST"], ["Konark", "EAST_COAST"], ["Bhubaneswar", "HERITAGE"], ["Chilika", "EAST_COAST"]] },
  { code: "WB", name: "West Bengal", zone: "EAST", def: "HERITAGE", spots: [["Darjeeling", "HIMALAYAN"], ["Kalimpong", "HIMALAYAN"], ["Digha", "EAST_COAST"], ["Sundarbans", "WILDLIFE"], ["Kolkata", "HERITAGE"]] },
  // ---------------- CENTRAL ----------------
  { code: "MP", name: "Madhya Pradesh", zone: "CENTRAL", def: "HERITAGE", spots: [["Khajuraho", "HERITAGE"], ["Kanha", "WILDLIFE"], ["Bandhavgarh", "WILDLIFE"], ["Pachmarhi", "HILL"], ["Gwalior", "HERITAGE"], ["Ujjain", "PILGRIMAGE"]] },
  { code: "CG", name: "Chhattisgarh", zone: "CENTRAL", def: "HERITAGE", spots: [["Raipur", "HERITAGE"], ["Jagdalpur (Chitrakote)", "WILDLIFE"], ["Sirpur", "HERITAGE"]] },
  // ---------------- NORTH-EAST ----------------
  { code: "SK", name: "Sikkim", zone: "NORTHEAST", def: "HIMALAYAN", spots: [["Gangtok", "HIMALAYAN"], ["Pelling", "HIMALAYAN"], ["Lachung", "HIMALAYAN"]] },
  { code: "AS", name: "Assam", zone: "NORTHEAST", def: "HERITAGE", spots: [["Kaziranga", "WILDLIFE"], ["Guwahati", "PILGRIMAGE"], ["Majuli", "HERITAGE"]] },
  { code: "AR", name: "Arunachal Pradesh", zone: "NORTHEAST", def: "HIMALAYAN", spots: [["Tawang", "HIMALAYAN"], ["Ziro", "HILL"], ["Bomdila", "HIMALAYAN"]] },
  { code: "NL", name: "Nagaland", zone: "NORTHEAST", def: "HILL", spots: [["Kohima", "HILL"], ["Dzukou Valley", "HILL"]] },
  { code: "MN", name: "Manipur", zone: "NORTHEAST", def: "HILL", spots: [["Imphal", "HERITAGE"], ["Loktak Lake", "HILL"]] },
  { code: "MZ", name: "Mizoram", zone: "NORTHEAST", def: "HILL", spots: [["Aizawl", "HILL"]] },
  { code: "ML", name: "Meghalaya", zone: "NORTHEAST", def: "HILL", spots: [["Shillong", "HILL"], ["Cherrapunji", "HILL"], ["Dawki", "HILL"]] },
  { code: "TR", name: "Tripura", zone: "NORTHEAST", def: "HERITAGE", spots: [["Agartala", "HERITAGE"], ["Unakoti", "HERITAGE"]] },
  // ---------------- ISLANDS ----------------
  { code: "AN", name: "Andaman & Nicobar Islands", zone: "ISLANDS", def: "ISLAND", spots: [["Port Blair", "ISLAND"], ["Havelock (Swaraj Dweep)", "ISLAND"], ["Neil Island", "ISLAND"]] },
  { code: "LD", name: "Lakshadweep", zone: "ISLANDS", def: "ISLAND", spots: [["Agatti", "ISLAND"], ["Bangaram", "ISLAND"], ["Kavaratti", "ISLAND"]] },
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

const SKILLS = [
  { name: "Deep Cleaning", category: "HOUSEKEEPING" },
  { name: "Laundry", category: "HOUSEKEEPING" },
  { name: "Turndown Service", category: "HOUSEKEEPING" },
  { name: "Banquet Service", category: "FNB" },
  { name: "Room Service", category: "FNB" },
  { name: "Bartending", category: "FNB" },
  { name: "Silver Service", category: "FNB" },
  { name: "North Indian Cuisine", category: "KITCHEN" },
  { name: "South Indian Cuisine", category: "KITCHEN" },
  { name: "Tandoor", category: "KITCHEN" },
  { name: "Continental Cuisine", category: "KITCHEN" },
  { name: "Chinese Cuisine", category: "KITCHEN" },
  { name: "Bakery & Pastry", category: "KITCHEN" },
  { name: "Reservations", category: "FRONT_OFFICE" },
  { name: "Guest Relations", category: "FRONT_OFFICE" },
  { name: "Concierge", category: "FRONT_OFFICE" },
  { name: "Spa Therapy", category: "WELLNESS" },
  { name: "Ayurveda", category: "WELLNESS" },
  { name: "Electrical", category: "MAINTENANCE" },
  { name: "Plumbing", category: "MAINTENANCE" },
  { name: "HVAC", category: "MAINTENANCE" },
  { name: "CCTV Monitoring", category: "SECURITY" },
  { name: "Driving", category: "OTHER" },
  { name: "Multilingual (English/Hindi)", category: "OTHER" },
];

const AMENITIES = [
  "Swimming Pool", "Spa", "Multi-cuisine Restaurant", "Bar", "Banquet Hall",
  "Gym", "Parking", "Wi-Fi", "Room Service", "Conference Hall", "Staff Quarters",
];

const PLANS = [
  { key: "FREE", name: "Free", pricePaise: 0, blurb: "Browse the national map + list surplus staff.", featuresJson: JSON.stringify(["National seasonal map", "List up to 1 surplus declaration", "Community support"]), sortOrder: 1 },
  { key: "STARTER", name: "Starter", pricePaise: 249900, blurb: "For a single budget/mid property.", featuresJson: JSON.stringify(["Unlimited declarations", "Matching + deputations", "Two-way ratings", "Email support"]), sortOrder: 2 },
  { key: "GROWTH", name: "Growth", pricePaise: 599900, blurb: "For busy properties in strong corridors.", featuresJson: JSON.stringify(["Everything in Starter", "Priority matching", "Corridor analytics", "Managed-payroll add-on"]), sortOrder: 3 },
  { key: "ENTERPRISE", name: "Enterprise", pricePaise: 1499900, blurb: "For groups & chains redeploying at scale.", featuresJson: JSON.stringify(["Everything in Growth", "Multi-property group console", "API access", "Dedicated success manager"]), sortOrder: 4 },
];

const slug = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "");

async function wipe() {
  await prisma.workerSkill.deleteMany();
  await prisma.hotelAmenity.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.favourite.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.message.deleteMany();
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

  // Regions = hotspots (+ a "Rest of <state>" fallback per state)
  const regionId: Record<string, string> = {};
  let regionCount = 0;
  for (const st of STATES) {
    const entries: [string, ArchKey][] = [...st.spots, [`Rest of ${st.name}`, st.def]];
    for (const [name, archKey] of entries) {
      const arch = ARCH[archKey];
      const code = name.startsWith("Rest of") ? `${st.code}-OTHER` : `${st.code}-${slug(name)}`;
      const region = await prisma.region.create({
        data: { code, name, state: st.name, zone: st.zone, dominantType: arch.type },
      });
      regionId[code] = region.id;
      regionCount++;
      await prisma.seasonalPack.createMany({
        data: arch.m.map((state, i) => ({ regionId: region.id, month: i + 1, state })),
      });
    }
  }

  // Roles
  const roleId: Record<string, string> = {};
  for (const role of ROLES) {
    const created = await prisma.role.create({ data: role });
    roleId[role.name] = created.id;
  }

  // Revenue modules
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

  // Admin-managed taxonomy (M1)
  await prisma.skill.createMany({ data: SKILLS });
  await prisma.amenity.createMany({ data: AMENITIES.map((name) => ({ name })) });
  await prisma.plan.createMany({ data: PLANS });
  const skillByName = Object.fromEntries((await prisma.skill.findMany()).map((s) => [s.name, s.id]));
  const amenityByName = Object.fromEntries((await prisma.amenity.findMany()).map((a) => [a.name, a.id]));

  // Hotels — Panaji, Goa (off-season now) lends to Manali (peak now)
  const group = await prisma.hotelGroup.create({ data: { name: "Coast & Peaks Hospitality" } });
  const hotelA = await prisma.hotel.create({
    data: { name: "Sunset Sands Resort", groupId: group.id, regionId: regionId["GA-PANAJI"], city: "Panaji, Goa", rooms: 42, tier: "MID", staffHousingCapacity: 20, cuisinesJson: JSON.stringify(["Goan", "North Indian", "Continental"]), languagesJson: JSON.stringify(["English", "Hindi", "Konkani"]) },
  });
  const hotelB = await prisma.hotel.create({
    data: { name: "Himalayan Vista Inn", groupId: group.id, regionId: regionId["HP-MANALI"], city: "Manali, Himachal Pradesh", rooms: 34, tier: "MID", staffHousingCapacity: 15, cuisinesJson: JSON.stringify(["North Indian", "Chinese"]), languagesJson: JSON.stringify(["English", "Hindi"]) },
  });
  const hotelC = await prisma.hotel.create({
    data: { name: "Desert Pearl Haveli", regionId: regionId["RJ-JAISALMER"], city: "Jaisalmer, Rajasthan", rooms: 22, tier: "BUDGET" },
  });

  await prisma.subscription.create({ data: { hotelId: hotelA.id, plan: "GROWTH", status: "ACTIVE", currentPeriodEnd: d(30) } });
  await prisma.subscription.create({ data: { hotelId: hotelB.id, plan: "STARTER", status: "ACTIVE", currentPeriodEnd: d(30) } });
  await prisma.subscription.create({ data: { hotelId: hotelC.id, plan: "FREE", status: "ACTIVE" } });

  const workerSeed = [
    { name: "Ramesh Kumar", role: "Housekeeping", exp: 6, wage: 70000, rep: 4.6, kyc: "VERIFIED", skills: ["deep cleaning", "laundry"] },
    { name: "Suresh Naik", role: "Cook", exp: 8, wage: 120000, rep: 4.8, kyc: "VERIFIED", skills: ["north indian", "tandoor", "continental"] },
    { name: "Priya Fernandes", role: "Front Desk", exp: 4, wage: 90000, rep: 4.3, kyc: "VERIFIED", skills: ["reservations", "english", "hindi"] },
    { name: "Anil Gaonkar", role: "F&B Steward", exp: 3, wage: 65000, rep: 4.0, kyc: "PENDING", skills: ["banquet", "room service"] },
    { name: "Kavita Shetty", role: "Housekeeping", exp: 5, wage: 68000, rep: 4.5, kyc: "VERIFIED", skills: ["housekeeping", "spa assist"] },
  ];
  const roleDefaultSkills: Record<string, string[]> = {
    Housekeeping: ["Deep Cleaning", "Laundry"],
    Cook: ["North Indian Cuisine", "Tandoor"],
    "Front Desk": ["Reservations", "Guest Relations"],
    "F&B Steward": ["Banquet Service", "Room Service"],
  };
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
        relocationPrefsJson: JSON.stringify({
          zones: ["NORTH", "WEST", "SOUTH", "EAST", "CENTRAL", "NORTHEAST", "ISLANDS"],
          maxDistanceKm: 3000,
        }),
      },
    });
    workers.push(worker);
    for (const sn of roleDefaultSkills[w.role] ?? []) {
      if (skillByName[sn]) await prisma.workerSkill.create({ data: { workerId: worker.id, skillId: skillByName[sn], proficiency: 4 } });
    }
  }

  // Hotel amenities (demo)
  const amenityFor: Record<string, string[]> = {
    [hotelA.id]: ["Swimming Pool", "Multi-cuisine Restaurant", "Bar", "Staff Quarters", "Wi-Fi"],
    [hotelB.id]: ["Multi-cuisine Restaurant", "Staff Quarters", "Wi-Fi", "Parking"],
    [hotelC.id]: ["Bar", "Wi-Fi", "Staff Quarters"],
  };
  for (const [hid, names] of Object.entries(amenityFor)) {
    for (const n of names) {
      if (amenityByName[n]) await prisma.hotelAmenity.create({ data: { hotelId: hid, amenityId: amenityByName[n] } });
    }
  }

  await prisma.user.create({ data: { email: "admin@ht.test", passwordHash: PW, name: "Platform Admin", role: "PLATFORM_ADMIN" } });
  const goaUser = await prisma.user.create({ data: { email: "goa@ht.test", passwordHash: PW, name: "Goa GM (Sunset Sands)", role: "HOTELIER_ADMIN", hotelId: hotelA.id } });
  const hillsUser = await prisma.user.create({ data: { email: "hills@ht.test", passwordHash: PW, name: "Manali GM (Himalayan Vista)", role: "HOTELIER_ADMIN", hotelId: hotelB.id } });
  await prisma.user.create({ data: { email: "raj@ht.test", passwordHash: PW, name: "Jaisalmer GM (Desert Pearl)", role: "HOTELIER_ADMIN", hotelId: hotelC.id } });
  const workerUser = await prisma.user.create({ data: { email: "worker@ht.test", passwordHash: PW, name: workers[0].name, role: "WORKER", workerId: workers[0].id } });

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

  // ---------------- M3 demo: completed corridor + symmetric reviews ----------------
  const overallOf = (m: Record<string, number>) =>
    Math.round(Object.values(m).reduce((s, n) => s + n, 0) / Object.values(m).length);
  const clamp5 = (n: number) => Math.max(1, Math.min(5, n));

  async function recomputeWorker(workerId: string) {
    const rs = await prisma.rating.findMany({ where: { targetWorkerId: workerId } });
    const a = aggregateWorker(rs);
    const deputationsCount = await prisma.deputation.count({ where: { workerId, state: { in: ["COMPLETED", "RETURNED"] } } });
    await prisma.worker.update({
      where: { id: workerId },
      data: { reputationScore: a.overall, ratingCount: a.count, dimensionAggJson: JSON.stringify(a.dims), rehireRate: a.rehireRate, deputationsCount },
    });
  }
  async function recomputeHotel(hotelId: string) {
    const rs = await prisma.rating.findMany({ where: { targetHotelId: hotelId } });
    const a = aggregateHotel(rs);
    await prisma.hotel.update({ where: { id: hotelId }, data: { ratingAggJson: JSON.stringify(a.dims), ratingCount: a.count } });
  }

  // Every worker has one past Goa→Manali deputation + a host review (gives real portable reputation).
  for (const w of workers) {
    const dep = await prisma.deputation.create({
      data: {
        workerId: w.id, homeHotelId: hotelA.id, demandHotelId: hotelB.id, roleId: w.primaryRoleId,
        startDate: d(-120), endDate: d(-30), wagePerDayPaise: 90000, housingProvided: true, state: "COMPLETED",
      },
    });
    const r = clamp5(Math.round(w.reputationScore));
    const wd = { skill: r, punctuality: clamp5(r), grooming: r, guestHandling: clamp5(r - 1), teamwork: r, reliability: r };
    await prisma.rating.create({
      data: {
        deputationId: dep.id, targetWorkerId: w.id, raterLabel: "Host Hotel", raterRole: "HOST_HOTEL",
        score: overallOf(wd), scoresJson: JSON.stringify(wd), wouldRehire: w.reputationScore >= 4.3,
        comment: w.reputationScore >= 4.5 ? "Excellent — guests noticed. Would take again next peak." : null,
      },
    });
    // Two workers review the host hotel (reverse reputation); worker@ (workers[0]) is left free to rate live in the UI.
    if (w.id === workers[1].id || w.id === workers[4].id) {
      const hd = { fairTreatment: 5, timelyPay: 4, accommodation: 4, workConditions: 5, respect: 5 };
      await prisma.rating.create({
        data: {
          deputationId: dep.id, targetHotelId: hotelB.id, raterLabel: "Worker", raterRole: "WORKER",
          score: overallOf(hd), scoresJson: JSON.stringify(hd),
          comment: "Fair employer — paid on time, decent staff quarters. Would return.",
        },
      });
    }
  }

  await prisma.favourite.create({ data: { hotelId: hotelB.id, workerId: workers[0].id } });

  for (const w of workers) await recomputeWorker(w.id);
  await recomputeHotel(hotelB.id);

  // ---------------- M4 demo: a live wage negotiation (Goa → Manali) ----------------
  const negWorker = workers[2];
  const negDep = await prisma.deputation.create({
    data: {
      workerId: negWorker.id, homeHotelId: hotelA.id, demandHotelId: hotelB.id, roleId: negWorker.primaryRoleId,
      startDate: d(14), endDate: d(104), wagePerDayPaise: 90000, housingProvided: true, state: "NEGOTIATING",
    },
  });
  await prisma.offer.create({
    data: { deputationId: negDep.id, byParty: "DEMAND_HOTEL", wagePerDayPaise: 90000, startDate: d(14), endDate: d(104), housingProvided: true, status: "COUNTERED", note: "Opening offer" },
  });
  await prisma.offer.create({
    data: { deputationId: negDep.id, byParty: "HOME_HOTEL", wagePerDayPaise: 105000, startDate: d(14), endDate: d(104), housingProvided: true, status: "PROPOSED", note: "Peak-season rate for our trained staff" },
  });

  // ---------------- M5 demo: messages, a dispute, notifications ----------------
  await prisma.message.create({ data: { threadKey: negDep.id, fromUserId: hillsUser.id, body: "Can your team start a week earlier for the autumn rush?" } });
  await prisma.message.create({ data: { threadKey: negDep.id, fromUserId: goaUser.id, body: "Yes — we can arrange travel for the 10th." } });
  await prisma.dispute.create({
    data: { deputationId: negDep.id, raisedByUserId: goaUser.id, category: "HOUSING", description: "Please confirm staff quarters have heating for the winter posting.", status: "OPEN" },
  });
  await prisma.notification.create({ data: { recipientUserId: hillsUser.id, title: "New counter-offer", body: "Home hotel proposed ₹1,050/day." } });
  await prisma.notification.create({ data: { recipientUserId: workerUser.id, title: "Welcome to HT", body: "Your reputation is now visible to hotels across India." } });

  // ---------------- M6: analytics assumptions + a filled declaration ----------------
  await prisma.platformSetting.create({
    data: { key: "savings", valueJson: JSON.stringify({ rehireCostPaise: 1500000, retrainCostPaise: 800000, idlePayrollRecoveryPct: 60 }) },
  });
  await prisma.seasonDeclaration.updateMany({
    where: { hotelId: hotelB.id, type: "DEMAND", roleId: roleId["Housekeeping"] },
    data: { status: "FULFILLED" },
  });

  console.log("Seed complete:");
  console.log(`  ${regionCount} hotspots across ${STATES.length} states/UTs × 12 seasonal packs`);
  console.log(`  ${ROLES.length} roles, ${REVENUE_MODULE_CATALOG.length} revenue modules, 3 hotels, ${workers.length} workers`);
  console.log("\nDemo logins (password: password123): admin@ / goa@ / hills@ / raj@ / worker@ht.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
