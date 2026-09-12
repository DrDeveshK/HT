import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addRole, setRoleActive, addSkill, setSkillActive } from "@/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, CardHeader, Field, Input, Select, Badge, Table, Th, Td } from "@/components/ui";
import { ROLE_CATEGORIES } from "@/lib/constants";

export default async function AdminTaxonomy() {
  await requireRole("PLATFORM_ADMIN");
  const [roles, skills] = await Promise.all([
    prisma.role.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.skill.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <>
      <PageHeader title="Taxonomy" subtitle="Roles and skills used across the platform — add or retire any." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Roles" subtitle={`${roles.length} total`} />
          <div className="space-y-4 p-5">
            <form action={addRole} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[9rem] flex-1"><Field label="New role"><Input name="name" placeholder="e.g. Butler" required /></Field></div>
              <Field label="Category">
                <Select name="category" defaultValue="OTHER">
                  {ROLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <SubmitButton pendingText="Adding…">Add</SubmitButton>
            </form>
            <Table>
              <thead><tr><Th>Role</Th><Th>Category</Th><Th>Status</Th><Th /></tr></thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id}>
                    <Td className="font-medium text-slate-800">{r.name}</Td>
                    <Td className="text-xs">{r.category}</Td>
                    <Td><Badge tone={r.active ? "green" : "slate"}>{r.active ? "Active" : "Inactive"}</Badge></Td>
                    <Td>
                      <form action={setRoleActive}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={String(!r.active)} />
                        <button className="text-xs text-slate-400 hover:text-brand-600">{r.active ? "Deactivate" : "Activate"}</button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Skills" subtitle={`${skills.length} total`} />
          <div className="space-y-4 p-5">
            <form action={addSkill} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[9rem] flex-1"><Field label="New skill"><Input name="name" placeholder="e.g. Sommelier" required /></Field></div>
              <Field label="Category">
                <Select name="category" defaultValue="OTHER">
                  {ROLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <SubmitButton pendingText="Adding…">Add</SubmitButton>
            </form>
            <Table>
              <thead><tr><Th>Skill</Th><Th>Category</Th><Th>Status</Th><Th /></tr></thead>
              <tbody>
                {skills.map((s) => (
                  <tr key={s.id}>
                    <Td className="font-medium text-slate-800">{s.name}</Td>
                    <Td className="text-xs">{s.category}</Td>
                    <Td><Badge tone={s.active ? "green" : "slate"}>{s.active ? "Active" : "Inactive"}</Badge></Td>
                    <Td>
                      <form action={setSkillActive}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="active" value={String(!s.active)} />
                        <button className="text-xs text-slate-400 hover:text-brand-600">{s.active ? "Deactivate" : "Activate"}</button>
                      </form>
                    </Td>
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
