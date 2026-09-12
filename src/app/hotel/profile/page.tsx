import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleHotelAmenity, updateHotelProfile } from "@/actions/hotel";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";

function parseArr(json: string): string[] {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

export default async function HotelProfile() {
  const user = await requireRole("HOTELIER_ADMIN");
  const hotel = await prisma.hotel.findUnique({
    where: { id: user.hotelId! },
    include: { amenities: { include: { amenity: true } }, region: true },
  });
  if (!hotel) return null;

  const allAmenities = await prisma.amenity.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const have = new Set(hotel.amenities.map((a) => a.amenityId));

  return (
    <>
      <PageHeader title="Property profile" subtitle={`${hotel.name} · ${hotel.city}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Details" subtitle="Helps staff and partner hotels know your property" />
          <form action={updateHotelProfile} className="space-y-4 p-5">
            <Field label="Cuisines (comma-separated)"><Input name="cuisines" defaultValue={parseArr(hotel.cuisinesJson).join(", ")} placeholder="North Indian, Continental" /></Field>
            <Field label="Languages (comma-separated)"><Input name="languages" defaultValue={parseArr(hotel.languagesJson).join(", ")} placeholder="English, Hindi" /></Field>
            <Field label="Staff housing capacity"><Input name="staffHousingCapacity" type="number" min={0} defaultValue={hotel.staffHousingCapacity} /></Field>
            <Field label="Brand standards / notes"><Textarea name="brandStandards" rows={3} defaultValue={hotel.brandStandards ?? ""} /></Field>
            <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
          </form>
        </Card>

        <Card>
          <CardHeader title="Amenities" subtitle="Click to toggle" />
          <div className="flex flex-wrap gap-2 p-5">
            {allAmenities.map((a) => (
              <form key={a.id} action={toggleHotelAmenity}>
                <input type="hidden" name="amenityId" value={a.id} />
                <button
                  className={`rounded-full border px-3 py-1 text-xs ${have.has(a.id) ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-400"}`}
                >
                  {a.name}
                </button>
              </form>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
