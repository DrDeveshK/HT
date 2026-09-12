import { prisma } from "@/lib/db";
import { SignupForm } from "./SignupForm";

export default async function SignupPage() {
  const regions = await prisma.region.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return <SignupForm regions={regions} />;
}
