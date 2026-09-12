import { prisma } from "@/lib/db";
import { SignupForm } from "./SignupForm";

export default async function SignupPage() {
  const regions = await prisma.region.findMany({
    orderBy: [{ zone: "asc" }, { state: "asc" }, { name: "asc" }],
    select: { id: true, name: true, state: true, zone: true },
  });
  return <SignupForm regions={regions} />;
}
