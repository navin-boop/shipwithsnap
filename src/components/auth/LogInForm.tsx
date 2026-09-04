"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { logIn, type AuthFormState } from "@/lib/auth/actions";

export function LogInForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(logIn, undefined);
  const fe = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Input name="email" type="email" label="Email" placeholder="you@yourstore.com" autoComplete="email" defaultValue={v.email} error={fe.email} required />
      <Input name="password" type="password" label="Password" autoComplete="current-password" error={fe.password} required />
      {state?.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" variant="secondary" size="lg" disabled={pending} className="w-full">
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
