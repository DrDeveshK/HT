import { SignJWT } from "jose";
import { prisma } from "../src/lib/db";

const base = "http://localhost:3000";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-insecure-secret");

async function tokenFor(email: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) throw new Error("no user " + email);
  return new SignJWT({ role: u.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(u.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

async function get(path: string, token: string) {
  const r = await fetch(base + path, { headers: { cookie: `ht_session=${token}` }, redirect: "manual" });
  return { status: r.status, body: await r.text() };
}

async function main() {
  const [goa, hills, admin, worker] = await Promise.all([
    tokenFor("goa@ht.test"),
    tokenFor("hills@ht.test"),
    tokenFor("admin@ht.test"),
    tokenFor("worker@ht.test"),
  ]);

  const ramesh = await prisma.worker.findFirst({ where: { name: "Ramesh Kumar" } });
  const hotelB = await prisma.hotel.findFirst({ where: { name: "Himalayan Vista Inn" } });

  const checks: [string, string, string][] = [
    ["/hotel", hills, "Welcome, Himalayan Vista Inn"],
    ["/hotel", hills, "Lakshadweep"], // island UT present in map
    ["/hotel", hills, "Mount Abu"], // within-state hotspot (summer hill in Rajasthan)
    ["/hotel", hills, "Jaisalmer"], // within-state hotspot (winter desert in Rajasthan)
    ["/hotel/marketplace", hills, "Sunset Sands Resort"], // borrower sees Goa surplus
    ["/hotel/declarations", goa, "Your declarations"],
    ["/hotel/subscription", goa, "Growth"],
    ["/admin", admin, "Platform overview"],
    ["/admin/revenue", admin, "Deputation commission"],
    ["/admin/seasons", admin, "Click a state to expand"],
    ["/admin", admin, "MRR"],
    ["/admin/workers", admin, "talent pool"],
    ["/admin/deputations", admin, "in progress"],
    ["/admin/revenue", admin, "Revenue to date"],
    ["/admin/taxonomy", admin, "Roles"],
    ["/admin/plans", admin, "Subscription tiers"],
    ["/admin/settings", admin, "Amenities"],
    ["/admin/seasons", admin, "Add a destination"],
    ["/worker", worker, "Your deputations"],
    ["/worker/profile", worker, "My profile"],
    ["/hotel/profile", goa, "Property profile"],
    // M3
    ["/admin/reviews", admin, "Moderate"],
    ["/hotel/marketplace", hills, "Your rehire shortlist"],
    ["/worker", worker, "Employer rating"],
    ["/worker", worker, "Rate this hotel"],
  ];

  let ok = true;
  for (const [path, tok, needle] of checks) {
    const { status, body } = await get(path, tok);
    const found = body.includes(needle);
    if (status !== 200 || !found) ok = false;
    console.log(`${path.padEnd(24)} ${status} ${found ? "✓" : "✗ MISSING"} "${needle}"`);
  }

  // M3 public profiles (dynamic ids)
  if (ramesh) {
    const wp = await get(`/workers/${ramesh.id}`, hills);
    const okwp = wp.status === 200 && wp.body.includes("Performance breakdown") && wp.body.includes("Rehire rate");
    console.log(`/workers/:id             ${wp.status} ${okwp ? "✓" : "✗ MISSING"} worker profile`);
    if (!okwp) ok = false;
  } else ok = false;
  if (hotelB) {
    const hp = await get(`/hotels/${hotelB.id}`, worker);
    const okhp = hp.status === 200 && hp.body.includes("How they treat staff");
    console.log(`/hotels/:id              ${hp.status} ${okhp ? "✓" : "✗ MISSING"} hotel profile`);
    if (!okhp) ok = false;
  } else ok = false;

  const mk = await get("/hotel/marketplace", hills);
  const showsWorker = mk.body.includes("Ramesh Kumar");
  const showsMatch = mk.body.includes("% match"); // ScorePill rendered
  console.log(`marketplace: worker listed ${showsWorker ? "✓" : "✗"}, match score ${showsMatch ? "✓" : "✗"}`);
  if (!showsWorker || !showsMatch) ok = false;

  console.log(ok ? "\nSMOKE-AUTH: PASS" : "\nSMOKE-AUTH: FAIL");
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
