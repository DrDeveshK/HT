import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/lib/constants";

const COOKIE = "ht_session";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-insecure-secret",
);

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSession(uid: string, role: UserRole): Promise<void> {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(uid)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const uid = payload.sub as string;
    return await prisma.user.findUnique({
      where: { id: uid },
      include: {
        hotel: { include: { region: true, subscription: true } },
        worker: {
          include: {
            homeHotel: { include: { region: true } },
            primaryRole: true,
          },
        },
      },
    });
  } catch {
    return null;
  }
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function roleHome(role: UserRole): string {
  if (role === "PLATFORM_ADMIN") return "/admin";
  if (role === "WORKER") return "/worker";
  return "/hotel";
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== role) redirect(roleHome(user.role as UserRole));
  return user;
}
