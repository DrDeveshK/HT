"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type AuthState } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, Field, Input, Select } from "@/components/ui";

const initial: AuthState = { error: null };

const ZONE_LABEL: Record<string, string> = {
  NORTH: "North",
  WEST: "West",
  CENTRAL: "Central",
  EAST: "East",
  NORTHEAST: "North-East",
  SOUTH: "South",
  ISLANDS: "Islands",
};

export function SignupForm({ regions }: { regions: { id: string; name: string; zone: string }[] }) {
  const [state, action] = useActionState(signupAction, initial);
  const zones = [...new Set(regions.map((r) => r.zone))];

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 self-start">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-sm font-bold text-white">HT</span>
        <span className="font-semibold text-slate-800">Hospitality Talent Exchange</span>
      </Link>

      <Card className="p-6">
        <h1 className="text-xl font-bold text-slate-900">Onboard your hotel</h1>
        <p className="mt-1 text-sm text-slate-500">
          Anywhere in India — every state &amp; UT is supported. Start free.
        </p>

        <form action={action} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name"><Input name="name" required /></Field>
            <Field label="Email"><Input name="email" type="email" required /></Field>
          </div>
          <Field label="Password" hint="At least 6 characters"><Input name="password" type="password" required /></Field>

          <div className="border-t border-slate-100 pt-4">
            <Field label="Hotel name"><Input name="hotelName" required /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State / UT">
              <Select name="regionId" required defaultValue="">
                <option value="" disabled>Select your state / UT…</option>
                {zones.map((z) => (
                  <optgroup key={z} label={ZONE_LABEL[z] ?? z}>
                    {regions
                      .filter((r) => r.zone === z)
                      .map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="City / town"><Input name="city" required placeholder="e.g. Tawang" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rooms"><Input name="rooms" type="number" min={1} required defaultValue={20} /></Field>
            <Field label="Tier">
              <Select name="tier" defaultValue="MID">
                <option value="BUDGET">Budget</option>
                <option value="MID">Mid</option>
                <option value="UPSCALE">Upscale</option>
              </Select>
            </Field>
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton className="w-full" pendingText="Creating account…">Create account</SubmitButton>
        </form>

        <p className="mt-4 text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">Log in</Link>
        </p>
      </Card>
    </main>
  );
}
