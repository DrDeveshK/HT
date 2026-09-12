"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, createSession, destroySession, roleHome } from "@/lib/auth";
import type { UserRole } from "@/lib/constants";

export interface AuthState {
  error: string | null;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id, user.role as UserRole);
  redirect(roleHome(user.role as UserRole));
}

const signupSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  hotelName: z.string().min(2, "Enter the hotel name"),
  regionId: z.string().min(1, "Choose a region"),
  city: z.string().min(2, "Enter the city"),
  rooms: z.coerce.number().int().min(1).max(5000),
  tier: z.enum(["BUDGET", "MID", "UPSCALE"]),
});

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } });
  if (existing) return { error: "An account with this email already exists." };

  const hotel = await prisma.hotel.create({
    data: {
      name: d.hotelName,
      regionId: d.regionId,
      city: d.city,
      rooms: d.rooms,
      tier: d.tier,
      subscription: {
        create: {
          plan: "FREE",
          status: "TRIALING",
          currentPeriodEnd: new Date(Date.now() + 14 * 86400000),
        },
      },
    },
  });

  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email.toLowerCase(),
      passwordHash: await hashPassword(d.password),
      role: "HOTELIER_ADMIN",
      hotelId: hotel.id,
    },
  });

  await createSession(user.id, "HOTELIER_ADMIN");
  redirect("/hotel");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
