import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addWorkerSkill, removeWorkerSkill, updateWorkerProfile } from "@/actions/worker";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { ZONES } from "@/lib/archetypes";

export default async function WorkerProfile() {
  const user = await requireRole("WORKER");
  const worker = await prisma.worker.findUnique({
    where: { id: user.workerId! },
    include: { skills: { include: { skill: true } }, primaryRole: true, homeHotel: true },
  });
  if (!worker) return null;

  const allSkills = await prisma.skill.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const have = new Set(worker.skills.map((s) => s.skillId));
  const prefs = (() => {
    try {
      return JSON.parse(worker.relocationPrefsJson) as { zones?: string[]; maxDistanceKm?: number };
    } catch {
      return {};
    }
  })();
  const prefZones = new Set(prefs.zones ?? []);

  return (
    <>
      <PageHeader title="My profile" subtitle="Your passport — skills, wage and where you'll travel. This drives your matches." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Basics & relocation" />
          <form action={updateWorkerProfile} className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Experience (years)"><Input name="experienceYears" type="number" min={0} defaultValue={worker.experienceYears} /></Field>
              <Field label="Expected wage / day (₹)"><Input name="expectedWageRupees" type="number" min={0} defaultValue={worker.expectedWagePaise / 100} /></Field>
            </div>
            <Field label="Emergency contact"><Input name="emergencyContact" defaultValue={worker.emergencyContact ?? ""} placeholder="Name · phone" /></Field>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Willing to work in zones</p>
              <div className="flex flex-wrap gap-3">
                {ZONES.map((z) => (
                  <label key={z} className="flex items-center gap-1.5 text-sm text-slate-600">
                    <input type="checkbox" name="zones" value={z} defaultChecked={prefZones.has(z)} /> {z}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Max distance (km)"><Input name="maxDistanceKm" type="number" min={0} defaultValue={prefs.maxDistanceKm ?? 0} /></Field>
            <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
          </form>
        </Card>

        <Card>
          <CardHeader title="Skills" subtitle={`${worker.skills.length} added`} />
          <div className="space-y-4 p-5">
            <div className="space-y-2">
              {worker.skills.length === 0 ? (
                <p className="text-sm text-slate-400">No skills yet — add some below.</p>
              ) : (
                worker.skills.map((ws) => (
                  <div key={ws.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-700">
                      {ws.skill.name} <span className="text-amber-500">{"★".repeat(ws.proficiency)}</span>
                    </span>
                    <form action={removeWorkerSkill}>
                      <input type="hidden" name="id" value={ws.id} />
                      <button className="text-xs text-slate-400 hover:text-red-600">Remove</button>
                    </form>
                  </div>
                ))
              )}
            </div>
            <form action={addWorkerSkill} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
              <div className="min-w-[10rem] flex-1">
                <Field label="Add skill">
                  <Select name="skillId" required defaultValue="">
                    <option value="" disabled>Select…</option>
                    {allSkills.filter((s) => !have.has(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Level"><Select name="proficiency" defaultValue="4">{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
              <SubmitButton pendingText="Adding…">Add</SubmitButton>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
