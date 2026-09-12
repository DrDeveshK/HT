"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, Field, Input } from "@/components/ui";

const initial: AuthState = { error: null };

const DEMOS = [
  { label: "Hotelier · Goa (surplus)", email: "goa@ht.test" },
  { label: "Hotelier · Manali (demand)", email: "hills@ht.test" },
  { label: "Worker", email: "worker@ht.test" },
  { label: "Platform admin", email: "admin@ht.test" },
];

export default function LoginPage() {
  const [state, action] = useActionState(loginAction, initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 self-start">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-sm font-bold text-white">HT</span>
        <span className="font-semibold text-slate-800">Hospitality Talent Exchange</span>
      </Link>

      <Card className="p-6">
        <h1 className="text-xl font-bold text-slate-900">Log in</h1>
        <form action={action} className="mt-4 space-y-4">
          <Field label="Email">
            <Input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton className="w-full" pendingText="Logging in…">Log in</SubmitButton>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          No account?{" "}
          <Link href="/signup" className="font-medium text-brand-600 hover:underline">
            Onboard your hotel
          </Link>
        </p>
      </Card>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium text-slate-500">Quick demo logins (password: password123)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMOS.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword("password123");
              }}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
